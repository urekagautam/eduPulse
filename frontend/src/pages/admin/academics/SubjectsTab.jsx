import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Pencil, Search, Trash2 } from "lucide-react";
import Button from "../../../components/Button";
import {
  assignSubjectTeacher,
  createSubject,
  deleteSubject,
  fetchSubjects,
  updateSubject,
} from "../../../services/apiSubject";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const SEMESTER_NAMES = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
];
const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
  const name = names[level - 1] || `Level ${level}`;
  return structureType === "semester" ? `${name} Semester` : `${name} Year`;
}

function getLevelOptions(faculty) {
  if (!faculty) return [];
  const limit = faculty.structureType === "semester" ? 8 : 5;
  const max = Math.min(Math.max(Number(faculty.maxLevel) || 1, 1), limit);
  return Array.from({ length: max }, (_, i) => {
    const level = i + 1;
    return { value: level, label: getLevelLabel(faculty.structureType, level) };
  });
}

function teacherFullName(teacher) {
  return [
    teacher.profile.firstName,
    teacher.profile.middleName,
    teacher.profile.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function Field({ label, children, optional }) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {optional && (
          <span className="font-normal text-gray-500"> (optional)</span>
        )}
      </label>
      {children}
    </div>
  );
}

const assignmentBadgeClass = (status) =>
  status === "completed" ? "badge badge-success" : "badge badge-primary";

export default function SubjectsTab({
  faculties,
  teachers,
  activeStudentsForAssignments,
  onAssignmentsChange,
}) {
  const [subjects, setSubjects] = useState([]);
  const [subjectFacultyId, setSubjectFacultyId] = useState("");
  const [subjectLevel, setSubjectLevel] = useState("");
  const [subjectBatch, setSubjectBatch] = useState("");
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" });
  const [editingSubject, setEditingSubject] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState({});
  const [teacherDropdownOpenId, setTeacherDropdownOpenId] = useState(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  const subjectFaculty = faculties.find((f) => f._id === subjectFacultyId);
  const subjectLevelOptions = useMemo(
    () => getLevelOptions(subjectFaculty),
    [subjectFaculty],
  );
  const batchOptions = useMemo(() => {
    const batches = new Set();
    activeStudentsForAssignments.forEach((student) => {
      if (
        student.admission?.facultyId === subjectFacultyId &&
        String(student.enrollment?.currentLevel) === String(subjectLevel) &&
        student.enrollment?.status === "active"
      ) {
        batches.add(String(student.admission?.batch));
      }
    });
    return Array.from(batches).sort((a, b) => Number(b) - Number(a));
  }, [activeStudentsForAssignments, subjectFacultyId, subjectLevel]);
  const selectedSubjectBatch =
    subjectBatch && batchOptions.includes(String(subjectBatch))
      ? subjectBatch
      : batchOptions[0] || "";

  useEffect(() => {
    const loadSubjects = async () => {
      if (!subjectFacultyId || !subjectLevel) {
        setSubjects([]);
        return;
      }

      setLoadingSubjects(true);
      try {
        const response = await fetchSubjects({
          facultyId: subjectFacultyId,
          level: subjectLevel,
          batch: selectedSubjectBatch || undefined,
        });
        setSubjects(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        setSubjects([]);
        setNotice({
          type: "error",
          message: error.message || "Failed to load subjects.",
        });
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [subjectFacultyId, subjectLevel, selectedSubjectBatch]);

  const getTeacherOtherAssignments = (teacherId, excludeSubjectId) => {
    const teacher = teachers.find((item) => item._id === teacherId);
    return (teacher?.assignedSubjects || [])
      .filter(
        (assignment) =>
          String(assignment.subjectId) !== String(excludeSubjectId),
      )
      .map((assignment) => {
        const batch = assignment.batch || assignment.batches?.[0];
        return {
          id: `${assignment._id}-${batch || ""}`,
          label: [
            assignment.facultyCode,
            assignment.levelLabel,
            batch ? `Batch ${batch}` : "",
            assignment.name,
            assignment.statusLabel,
          ]
            .filter(Boolean)
            .join(" - "),
          status: assignment.status,
        };
      });
  };

  const handleSaveSubject = async () => {
    const faculty = subjectFaculty;
    if (!faculty || !subjectLevel || !subjectForm.name.trim()) return;

    setSavingSubject(true);
    setNotice({ type: "", message: "" });
    try {
      const payload = {
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim(),
      };
      const response = editingSubject
        ? await updateSubject(editingSubject._id, payload)
        : await createSubject({
            ...payload,
            facultyId: faculty._id,
            level: Number(subjectLevel),
          });

      if (response?.success && response.data) {
        setSubjects((current) =>
          editingSubject
            ? current.map((subject) =>
                subject._id === editingSubject._id ? response.data : subject,
              )
            : [response.data, ...current],
        );
        setSubjectForm({ name: "", code: "" });
        setEditingSubject(null);
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to add subject.",
      });
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (subject) => {
    if (!window.confirm(`Delete ${subject.name}? This cannot be undone.`)) {
      return;
    }

    setNotice({ type: "", message: "" });
    try {
      const response = await deleteSubject(subject._id);
      if (response?.success) {
        setSubjects((current) =>
          current.filter((item) => item._id !== subject._id),
        );
        if (editingSubject?._id === subject._id) {
          setEditingSubject(null);
          setSubjectForm({ name: "", code: "" });
        }
        setNotice({ type: "success", message: "Subject deleted successfully." });
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to delete subject.",
      });
    }
  };

  const handleAssignTeacher = async (subjectId, teacherId) => {
    setNotice({ type: "", message: "" });
    try {
      const response = await assignSubjectTeacher(
        subjectId,
        teacherId,
        selectedSubjectBatch,
      );
      if (response?.success && response.data) {
        setSubjects((current) =>
          current.map((subject) =>
            subject._id === subjectId ? response.data : subject,
          ),
        );
        onAssignmentsChange?.();
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to assign teacher.",
      });
    }
  };

  const SearchableTeacherSelect = ({ subjectId, currentTeacherId }) => {
    const isOpen = teacherDropdownOpenId === subjectId;
    const q = teacherSearch[subjectId] ?? "";
    const selected = teachers.find((t) => t._id === currentTeacherId);
    const query = q.trim().toLowerCase();

    const filtered = teachers.filter((t) => {
      if (!query) return true;
      const name = teacherFullName(t).toLowerCase();
      return (
        name.includes(query) ||
        t.facultyCode?.toLowerCase().includes(query) ||
        t.profile.phone?.includes(query)
      );
    });

    const openDropdown = () => {
      setTeacherDropdownOpenId(subjectId);
      setTeacherSearch((prev) => ({
        ...prev,
        [subjectId]: prev[subjectId] ?? "",
      }));
    };

    const closeDropdown = () => {
      setTeacherDropdownOpenId(null);
      setTeacherSearch((prev) => ({ ...prev, [subjectId]: "" }));
    };

    const pickTeacher = async (teacherId) => {
      await handleAssignTeacher(subjectId, teacherId);
      closeDropdown();
    };

    return (
      <div className="relative max-w-md">
        <button
          type="button"
          onClick={() => (isOpen ? closeDropdown() : openDropdown())}
          className={`${selectClass} flex w-full items-center justify-between gap-2 text-left`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span
            className={selected ? "font-medium text-gray-900" : "text-gray-500"}
          >
            {selected ? teacherFullName(selected) : "Select teacher..."}
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Close teacher list"
              onClick={closeDropdown}
            />
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-100 p-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="Search by name, faculty, phone..."
                    value={q}
                    onChange={(e) =>
                      setTeacherSearch((prev) => ({
                        ...prev,
                        [subjectId]: e.target.value,
                      }))
                    }
                    autoFocus
                  />
                </div>
              </div>

              <ul className="max-h-[45vh] overflow-y-auto py-1" role="listbox">
                {filtered.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-500">
                    No teachers found. Add teachers in the Teachers tab first.
                  </li>
                ) : (
                  filtered.map((t) => {
                    const isSelected = t._id === currentTeacherId;
                    return (
                      <li key={t._id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                            isSelected
                              ? "bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => pickTeacher(t._id)}
                        >
                          <div>
                            <span className="font-medium">
                              {teacherFullName(t)}
                            </span>
                            {t.facultyCode && (
                              <span className="mt-0.5 block text-xs text-gray-500">
                                {t.facultyCode}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Class subjects</h2>
        <p className="mb-4 text-sm text-gray-600">
          Add subjects per faculty and level. Teacher assignment is handled per
          batch below.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Faculty">
            <select
              className={selectClass}
              value={subjectFacultyId}
              onChange={(e) => {
                setSubjectFacultyId(e.target.value);
                setSubjectLevel("");
                setSubjectBatch("");
                setNotice({ type: "", message: "" });
              }}
            >
              <option value="">Select faculty</option>
              {faculties.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.code}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={
              subjectFaculty?.structureType === "year" ? "Year" : "Semester"
            }
          >
            <select
              className={selectClass}
              value={subjectLevel}
              onChange={(e) => {
                setSubjectLevel(e.target.value);
                setSubjectBatch("");
                setNotice({ type: "", message: "" });
              }}
              disabled={!subjectFacultyId}
            >
              <option value="">Select level</option>
              {subjectLevelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {notice.message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.type === "success"
              ? "bg-green-50 text-green-800 border border-green-100"
              : "bg-red-50 text-red-800 border border-red-100"
          }`}
        >
          {notice.message}
        </p>
      )}

      {subjectFacultyId && subjectLevel && (
        <>
          <div className="rounded-lg border-2 border-[var(--color-primary-border)] bg-white p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-gray-900">
                {editingSubject ? "Edit subject" : "Add subject"}
              </h3>
              {editingSubject && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingSubject(null);
                    setSubjectForm({ name: "", code: "" });
                  }}
                >
                  Cancel edit
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Subject name">
                <input
                  className={inputClass}
                  value={subjectForm.name}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, name: e.target.value })
                  }
                  placeholder="e.g. Database Management System"
                />
              </Field>
              <Field label="Subject code" optional>
                <input
                  className={inputClass}
                  value={subjectForm.code}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, code: e.target.value })
                  }
                  placeholder="e.g. BCA301"
                />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="primary"
                  onClick={handleSaveSubject}
                  disabled={savingSubject}
                >
                  {savingSubject
                    ? "Saving..."
                    : editingSubject
                      ? "Save changes"
                      : "Add subject"}
                </Button>
              </div>
            </div>
          </div>

          {loadingSubjects ? (
            <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
              Loading subjects...
            </div>
          ) : subjects.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
              No subjects for this class yet. Add subjects above.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-900">
                  Subjects in this class
                </h3>
                <div className="space-y-3">
                  {subjects.map((sub) => (
                    <div
                      key={sub._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {sub.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span>Code:</span>
                          <span className="badge badge-muted">
                            {sub.code || "Not set"}
                          </span>
                          <span className="badge badge-primary">
                            {sub.facultyCode}
                          </span>
                          <span className="badge badge-muted">
                            {sub.levelLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSubject(sub);
                            setSubjectForm({
                              name: sub.name || "",
                              code: sub.code || "",
                            });
                          }}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteSubject(sub)}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-900">
                  Teacher assignments
                </h3>
                <Field label="Current batch">
                  <input
                    className={`${inputClass} bg-gray-50 text-gray-600`}
                    value={
                      selectedSubjectBatch
                        ? `Batch ${selectedSubjectBatch}`
                        : "Auto selected"
                    }
                    readOnly
                  />
                </Field>
              </div>

              {!selectedSubjectBatch ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-gray-600">
                  No current active batch was found for this faculty and
                  sem/year.
                </div>
              ) : (
                subjects.map((sub) => (
                  <div
                    key={sub._id}
                    className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {sub.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Code: <span className="font-mono">{sub.code}</span> -{" "}
                          {sub.facultyCode} - {sub.levelLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {selectedSubjectBatch && sub.assignedTeacher ? (
                          <>
                            <span className="badge badge-success">
                              {sub.assignedTeacher.fullName}
                            </span>
                            <span className="badge badge-primary">
                              Batch {selectedSubjectBatch}
                            </span>
                          </>
                        ) : selectedSubjectBatch ? (
                          <span className="badge badge-muted">
                            No teacher assigned
                          </span>
                        ) : (
                          <span className="badge badge-muted">
                            Select batch to assign teacher
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSubject(sub);
                            setSubjectForm({
                              name: sub.name || "",
                              code: sub.code || "",
                            });
                          }}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteSubject(sub)}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>

                    {selectedSubjectBatch && (
                      <div>
                        <label className={labelClass}>
                          Assign / change teacher for Batch{" "}
                          {selectedSubjectBatch}
                        </label>
                        <SearchableTeacherSelect
                          subjectId={sub._id}
                          currentTeacherId={sub.assignedTeacher?.teacherId}
                        />
                      </div>
                    )}

                    {selectedSubjectBatch && sub.assignedTeacher && (
                      <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          Other subjects for this teacher
                        </p>
                        {getTeacherOtherAssignments(
                          sub.assignedTeacher.teacherId,
                          sub._id,
                        ).length === 0 ? (
                          <p className="text-sm text-gray-600">
                            No other subject assignments.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {getTeacherOtherAssignments(
                              sub.assignedTeacher.teacherId,
                              sub._id,
                            ).map((assignment) => (
                              <span
                                key={assignment.id}
                                className={assignmentBadgeClass(
                                  assignment.status,
                                )}
                              >
                                {assignment.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {(!subjectFacultyId || !subjectLevel) && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-600">
          Select faculty and level to manage subjects.
        </div>
      )}
    </div>
  );
}
