import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import Button from "../../components/Button";
import {
  deleteTeacherExamMark,
  fetchTeacherExamMarks,
  fetchTeacherMarksClass,
  fetchTeacherMarksContext,
  saveTeacherExamMarks,
} from "../../services/apiTeacherMarks";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

export default function Marks() {
  const [assignments, setAssignments] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [classData, setClassData] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [marksByStudent, setMarksByStudent] = useState(new Map());
  const [examAttendanceByStudent, setExamAttendanceByStudent] = useState(
    new Map(),
  );
  const [examAttendanceTaken, setExamAttendanceTaken] = useState(false);
  const [editedMarks, setEditedMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  useEffect(() => {
    const loadContext = async () => {
      setLoading(true);
      try {
        const response = await fetchTeacherMarksContext();
        const nextAssignments = response?.data?.assignments || [];
        setAssignments(nextAssignments);
        setSelectedOfferingId(nextAssignments[0]?.classOfferingId || "");
      } catch (error) {
        setNotice({
          type: "error",
          message: error.message || "Failed to load assigned subjects.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, []);

  useEffect(() => {
    const loadClass = async () => {
      setClassData(null);
      setSelectedExamId("");
      setMarksByStudent(new Map());
      setExamAttendanceByStudent(new Map());
      setExamAttendanceTaken(false);
      setEditedMarks({});
      if (!selectedOfferingId) return;

      setLoading(true);
      try {
        const response = await fetchTeacherMarksClass(selectedOfferingId);
        const data = response?.data || null;
        setClassData(data);
        setSelectedExamId(data?.exams?.[0]?.id || "");
        setNotice({ type: "", message: "" });
      } catch (error) {
        setNotice({
          type: "error",
          message: error.message || "Failed to load class details.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadClass();
  }, [selectedOfferingId]);

  useEffect(() => {
    const loadMarks = async () => {
      setMarksByStudent(new Map());
      setExamAttendanceByStudent(new Map());
      setExamAttendanceTaken(false);
      setEditedMarks({});
      if (!selectedOfferingId || !selectedExamId) return;
      if (classData?.assignment?.classOfferingId !== selectedOfferingId) return;

      const examBelongsToClass = (classData?.exams || []).some(
        (exam) => exam.id === selectedExamId,
      );
      if (!examBelongsToClass) return;

      try {
        const response = await fetchTeacherExamMarks(
          selectedOfferingId,
          selectedExamId,
        );
        const markMap = new Map();
        const edits = {};
        const attendanceMap = new Map();
        (response?.data?.attendance || []).forEach((record) => {
          attendanceMap.set(record.studentId, record.status);
        });
        const attendanceTaken = Boolean(response?.data?.attendanceTaken);
        (response?.data?.marks || []).forEach((mark) => {
          if (attendanceTaken && attendanceMap.get(mark.studentId) === "present") {
            markMap.set(mark.studentId, mark);
            edits[mark.studentId] = String(mark.obtainedMarks ?? "");
          }
        });
        setMarksByStudent(markMap);
        setExamAttendanceByStudent(attendanceMap);
        setExamAttendanceTaken(attendanceTaken);
        setEditedMarks(edits);
      } catch (error) {
        setNotice({
          type: "error",
          message: error.message || "Failed to load marks.",
        });
      }
    };

    loadMarks();
  }, [classData, selectedOfferingId, selectedExamId]);

  const currentAssignment = classData?.assignment;
  const students = classData?.students || [];
  const exams = classData?.exams || [];
  const currentExam = exams.find((exam) => exam.id === selectedExamId);
  const isPublished = currentExam?.published === true;
  const absentStudentIds = useMemo(() => {
    const absent = new Set();
    students.forEach((student) => {
      if (examAttendanceByStudent.get(student._id) !== "present") {
        absent.add(student._id);
      }
    });
    return absent;
  }, [examAttendanceByStudent, students]);

  const assignmentOptions = useMemo(
    () =>
      assignments.map((assignment) => ({
        value: assignment.classOfferingId,
        label: `${assignment.facultyCode} - ${assignment.levelLabel} - ${assignment.subjectCode ? `${assignment.subjectCode} ` : ""}${assignment.subjectName}`,
      })),
    [assignments],
  );

  const getMarkStatus = (studentId) => {
    if (absentStudentIds.has(studentId)) return "absent";
    const record = marksByStudent.get(studentId);
    if (!record) return "pending";
    const obtained = Number(record.obtainedMarks);
    const passMarks = Number(currentExam?.passMarks ?? currentExam?.fullMarks ?? 0);
    return obtained >= passMarks ? "passed" : "failed";
  };

  const rowClass = (studentId) => {
    const status = getMarkStatus(studentId);
    if (status === "absent") return "bg-yellow-50";
    if (status === "failed") return "bg-red-50";
    return "bg-white";
  };

  const markCellClass = (studentId) => {
    const status = getMarkStatus(studentId);
    if (status === "absent") return "rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800";
    if (status === "failed") return "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700";
    if (status === "passed") return "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800";
    return "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700";
  };

  const handleMarkChange = (studentId, value) => {
    if (isPublished || absentStudentIds.has(studentId)) return;
    const cleaned = value.replace(/[^0-9.]/g, "");
    setEditedMarks((current) => ({ ...current, [studentId]: cleaned }));
  };

  const handleSaveMarks = async () => {
    if (
      !selectedOfferingId ||
      !selectedExamId ||
      !currentExam ||
      isPublished ||
      !examAttendanceTaken
    ) {
      return;
    }

    setSaving(true);
    setNotice({ type: "", message: "" });
    try {
      await saveTeacherExamMarks(
        selectedOfferingId,
        selectedExamId,
        students.map((student) => ({
          studentId: student._id,
          obtainedMarks: editedMarks[student._id] ?? "",
        })),
      );

      const response = await fetchTeacherExamMarks(
        selectedOfferingId,
        selectedExamId,
      );
      const attendanceMap = new Map();
      (response?.data?.attendance || []).forEach((record) => {
        attendanceMap.set(record.studentId, record.status);
      });
      const latestAbsentStudentIds = new Set(
        students
          .filter((student) => attendanceMap.get(student._id) !== "present")
          .map((student) => student._id),
      );
      const markMap = new Map();
      (response?.data?.marks || []).forEach((mark) => {
        if (!latestAbsentStudentIds.has(mark.studentId)) {
          markMap.set(mark.studentId, mark);
        }
      });
      setMarksByStudent(markMap);
      setExamAttendanceByStudent(attendanceMap);
      setExamAttendanceTaken(Boolean(response?.data?.attendanceTaken));
      setNotice({ type: "success", message: "Marks saved successfully." });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to save marks.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMark = async (studentId) => {
    if (!selectedOfferingId || !selectedExamId || isPublished || !examAttendanceTaken) {
      return;
    }

    try {
      await deleteTeacherExamMark(selectedOfferingId, selectedExamId, studentId);
      setMarksByStudent((current) => {
        const next = new Map(current);
        next.delete(studentId);
        return next;
      });
      setEditedMarks((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to delete mark.",
      });
    }
  };

  const summary = useMemo(() => {
    const marks = Array.from(marksByStudent.values())
      .map((mark) => Number(mark.obtainedMarks))
      .filter((mark) => !Number.isNaN(mark));
    if (!marks.length) return null;
    const total = marks.reduce((sum, mark) => sum + mark, 0);
    return {
      count: marks.length,
      average: Number((total / marks.length).toFixed(1)),
      highest: Math.max(...marks),
      lowest: Math.min(...marks),
    };
  }, [marksByStudent]);

  const scorerLists = useMemo(() => {
    const entries = students
      .map((student) => ({
        student,
        marks: marksByStudent.has(student._id)
          ? Number(marksByStudent.get(student._id).obtainedMarks)
          : null,
      }))
      .filter((item) => item.marks != null && !Number.isNaN(item.marks));

    const sortedHigh = [...entries].sort((a, b) => b.marks - a.marks);
    const sortedLow = [...entries].sort((a, b) => a.marks - b.marks);

    return {
      top: sortedHigh.slice(0, 3),
      bottom: sortedLow.slice(0, 3),
    };
  }, [students, marksByStudent]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Marks</h1>
        <p className="mt-1 text-gray-600">
          Enter marks only for your currently active subject assignments.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Select subject
        </h2>

        {loading && !assignments.length ? (
          <p className="text-gray-600">Loading assigned subjects...</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-600">
            No active subject assignments found for your account.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className={labelClass}>Assigned subject</label>
              <select
                className={selectClass}
                value={selectedOfferingId}
                onChange={(event) => {
                  setSelectedOfferingId(event.target.value);
                  setNotice({ type: "", message: "" });
                }}
              >
                {assignmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Exam</label>
              <select
                className={selectClass}
                value={selectedExamId}
                onChange={(event) => {
                  setSelectedExamId(event.target.value);
                  setNotice({ type: "", message: "" });
                }}
                disabled={!exams.length}
              >
                <option value="">
                  {exams.length ? "Select exam" : "No exam routine found"}
                </option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} - {exam.fullMarks ?? 100} marks
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {currentAssignment && (
          <div className="mt-4 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-primary-strong)]">
            {currentAssignment.facultyCode} - {currentAssignment.levelLabel} -{" "}
            {currentAssignment.subjectName} - Batch {currentAssignment.batch}
          </div>
        )}
      </div>

      {notice.message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border border-green-100 bg-green-50 text-green-800"
              : "border border-red-100 bg-red-50 text-red-800"
          }`}
        >
          {notice.message}
        </p>
      )}

      {!selectedOfferingId || !selectedExamId ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <CalendarDays className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">
            Select an active subject and exam to enter marks.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {isPublished && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              This exam is published. Marks are visible but cannot be changed.
            </div>
          )}
          {!isPublished && !examAttendanceTaken && (
            <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-800">
              Exam attendance has not been marked by admin yet. Students are shown
              as absent until attendance is completed.
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Marks entry</h2>
              <p className="text-sm text-gray-600">
                {currentExam?.title} - Full marks {currentExam?.fullMarks ?? 100} · Pass marks {currentExam?.passMarks ?? currentExam?.fullMarks ?? 100}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleSaveMarks}
              disabled={saving || isPublished || !students.length || !examAttendanceTaken}
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save marks"
              )}
            </Button>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-180 text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Student ID</th>
                    <th className="px-4 py-3 font-semibold">Roll no.</th>
                    <th className="px-4 py-3 font-semibold">Obtained</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No active students found for this batch.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const record = marksByStudent.get(student._id);
                      const wasAbsent = absentStudentIds.has(student._id);
                      const attendanceStatus = examAttendanceByStudent.get(student._id);
                      const value =
                        editedMarks[student._id] ??
                        record?.obtainedMarks ??
                        "";
                      return (
                        <tr
                          key={student._id}
                          className={`border-t border-gray-100 ${rowClass(student._id)}`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {student.studentId}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {student.rollNo}
                          </td>
                          <td className="px-4 py-3">
                            {wasAbsent ? (
                              <span className={markCellClass(student._id)}>
                                Absent
                              </span>
                            ) : isPublished ? (
                              <span className={markCellClass(student._id)}>
                                {record?.obtainedMarks ?? "--"}
                              </span>
                            ) : (
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={currentExam?.fullMarks ?? 100}
                                  value={value}
                                  onChange={(event) =>
                                    handleMarkChange(
                                      student._id,
                                      event.target.value,
                                    )
                                  }
                                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                                {record && !wasAbsent && (
                                  <span className={markCellClass(student._id)}>
                                    {getMarkStatus(student._id) === "passed"
                                      ? "Passed"
                                      : "Failed"}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {wasAbsent ? (
                              <span className="text-sm font-medium text-gray-500">
                                {examAttendanceTaken && attendanceStatus === "absent"
                                  ? "Exam absent"
                                  : "Attendance pending"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteMark(student._id)}
                                disabled={isPublished || !record}
                                className="text-sm font-semibold text-red-600 disabled:text-gray-400"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {summary && (
            <div className="mt-6 grid gap-3 lg:grid-cols-4">
              {[
                ["Saved marks", summary.count],
                ["Average", summary.average],
                ["Highest", summary.highest],
                ["Lowest", summary.lowest],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {scorerLists.top.length > 0 && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-green-900">
                    Top scorers
                  </p>
                  <span className="text-xs font-medium uppercase tracking-wide text-green-700">
                    Best marks
                  </span>
                </div>
                <div className="space-y-2">
                  {scorerLists.top.map((entry, index) => (
                    <div
                      key={entry.student._id}
                      className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {entry.student.name}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-green-700">
                        {entry.marks}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-red-900">
                    Bottom scorers
                  </p>
                  <span className="text-xs font-medium uppercase tracking-wide text-red-700">
                    Needs attention
                  </span>
                </div>
                <div className="space-y-2">
                  {scorerLists.bottom.map((entry, index) => (
                    <div
                      key={entry.student._id}
                      className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {entry.student.name}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-red-700">
                        {entry.marks}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
