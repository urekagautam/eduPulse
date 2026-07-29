import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Info,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Button from "../../components/Button";
import { fetchFaculties } from "../../services/apiFaculty";
import {
  fetchAdminExamAttendanceContext,
  fetchAdminExamAttendanceSession,
  fetchAdminGeneralAttendance,
  saveAdminExamAttendance,
} from "../../services/apiAttendance";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

function getLevelOptions(faculty) {
  if (!faculty) return [];
  if (Array.isArray(faculty.levels) && faculty.levels.length) {
    return faculty.levels;
  }

  const max = Math.max(Number(faculty.maxLevel) || 1, 1);
  return Array.from({ length: max }, (_, index) => ({
    value: index + 1,
    label: `${faculty.structureType === "year" ? "Year" : "Semester"} ${index + 1}`,
  }));
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
}

function groupExamSessions(sessions) {
  const map = new Map();
  sessions.forEach((session) => {
    if (!map.has(session.examId)) {
      map.set(session.examId, {
        examId: session.examId,
        title: session.title,
        batch: session.batch,
        level: session.level,
        sessions: [],
      });
    }
    map.get(session.examId).sessions.push(session);
  });

  return Array.from(map.values()).map((exam) => ({
    ...exam,
    sessions: exam.sessions.sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
    ),
  }));
}

const statusBadge = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-800",
};

export default function Attendance() {
  const [faculties, setFaculties] = useState([]);
  const [filterFacultyId, setFilterFacultyId] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [category, setCategory] = useState("general");

  const [generalClasses, setGeneralClasses] = useState([]);
  const [examSessions, setExamSessions] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedExamItemId, setSelectedExamItemId] = useState("");
  const [examSessionData, setExamSessionData] = useState(null);
  const [examChecks, setExamChecks] = useState({});
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  const selectedFaculty = faculties.find(
    (faculty) => faculty._id === filterFacultyId,
  );
  const levelOptions = useMemo(
    () => getLevelOptions(selectedFaculty),
    [selectedFaculty],
  );

  const filteredExamSessions = useMemo(
    () =>
      examSessions.filter(
        (session) =>
          (!filterFacultyId || session.facultyId === filterFacultyId) &&
          (!filterLevel || String(session.level) === String(filterLevel)),
      ),
    [examSessions, filterFacultyId, filterLevel],
  );
  const examsForClass = useMemo(
    () => groupExamSessions(filteredExamSessions),
    [filteredExamSessions],
  );
  const selectedExam = examsForClass.find(
    (exam) => exam.examId === selectedExamId,
  );
  const selectedSession = selectedExam?.sessions.find(
    (session) => session.examItemId === selectedExamItemId,
  );

  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const response = await fetchFaculties();
        const nextFaculties = (response?.data || []).map((faculty) => ({
          ...faculty,
          _id: faculty._id ?? faculty.id,
        }));
        setFaculties(nextFaculties);
      } catch (err) {
        setError(err.message || "Failed to load faculties.");
      }
    };

    loadFaculties();
  }, []);

  useEffect(() => {
    const loadGeneralAttendance = async () => {
      if (category !== "general" || !filterFacultyId || !filterLevel) {
        setGeneralClasses([]);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetchAdminGeneralAttendance({
          facultyId: filterFacultyId,
          level: filterLevel,
        });
        setGeneralClasses(response?.data?.classes || []);
      } catch (err) {
        setGeneralClasses([]);
        setError(err.message || "Failed to load general attendance.");
      } finally {
        setLoading(false);
      }
    };

    loadGeneralAttendance();
  }, [category, filterFacultyId, filterLevel]);

  useEffect(() => {
    const loadExamContext = async () => {
      if (category !== "exam") return;

      setLoading(true);
      setError("");
      try {
        const response = await fetchAdminExamAttendanceContext();
        setExamSessions(response?.data?.sessions || []);
      } catch (err) {
        setExamSessions([]);
        setError(err.message || "Failed to load exam routines.");
      } finally {
        setLoading(false);
      }
    };

    loadExamContext();
  }, [category]);

  useEffect(() => {
    if (!examsForClass.length) {
      setSelectedExamId("");
      setSelectedExamItemId("");
      setExamSessionData(null);
      setExamChecks({});
      return;
    }

    if (!examsForClass.some((exam) => exam.examId === selectedExamId)) {
      setSelectedExamId(examsForClass[0].examId);
      setSelectedExamItemId(examsForClass[0].sessions[0]?.examItemId || "");
    }
  }, [examsForClass, selectedExamId]);

  useEffect(() => {
    if (!selectedExam || !selectedExam.sessions.length) {
      setSelectedExamItemId("");
      return;
    }

    if (
      !selectedExam.sessions.some(
        (session) => session.examItemId === selectedExamItemId,
      )
    ) {
      setSelectedExamItemId(selectedExam.sessions[0].examItemId);
    }
  }, [selectedExam, selectedExamItemId]);

  useEffect(() => {
    const loadExamSession = async () => {
      if (!selectedExamId || !selectedExamItemId) {
        setExamSessionData(null);
        setExamChecks({});
        return;
      }

      setLoading(true);
      setError("");
      setSaveMessage("");
      try {
        const response = await fetchAdminExamAttendanceSession(
          selectedExamId,
          selectedExamItemId,
        );
        const data = response?.data || null;
        setExamSessionData(data);

        const recordByStudent = new Map(
          (data?.records || []).map((record) => [record.studentId, record]),
        );
        const checks = {};
        (data?.students || []).forEach((student) => {
          checks[student._id] =
            recordByStudent.get(student._id)?.status === "present";
        });
        setExamChecks(checks);
      } catch (err) {
        setExamSessionData(null);
        setExamChecks({});
        setError(err.message || "Failed to load exam attendance.");
      } finally {
        setLoading(false);
      }
    };

    loadExamSession();
  }, [selectedExamId, selectedExamItemId]);

  const resetFilters = (facultyId, level = "") => {
    setFilterFacultyId(facultyId);
    setFilterLevel(level);
    setSelectedExamId("");
    setSelectedExamItemId("");
    setExamSessionData(null);
    setExamChecks({});
    setSaveMessage("");
  };

  const markAllExam = (present) => {
    const checks = {};
    (examSessionData?.students || []).forEach((student) => {
      checks[student._id] = present;
    });
    setExamChecks(checks);
  };

  const handleSaveExamAttendance = async () => {
    if (!selectedExamId || !selectedExamItemId || !examSessionData) return;

    setLoading(true);
    setError("");
    setSaveMessage("");
    try {
      await saveAdminExamAttendance(
        selectedExamId,
        selectedExamItemId,
        (examSessionData.students || []).map((student) => ({
          studentId: student._id,
          status: examChecks[student._id] ? "present" : "absent",
        })),
      );
      setSaveMessage("Exam attendance saved successfully.");

      const response = await fetchAdminExamAttendanceSession(
        selectedExamId,
        selectedExamItemId,
      );
      setExamSessionData(response?.data || null);
    } catch (err) {
      setError(err.message || "Failed to save exam attendance.");
    } finally {
      setLoading(false);
    }
  };

  const totalExamStudents = examSessionData?.students?.length || 0;
  const presentExamStudents = Object.values(examChecks).filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-gray-600">
            View teacher-marked class attendance and mark exam attendance from
            saved exam routines.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className={labelClass}>Faculty</label>
            <select
              className={selectClass}
              value={filterFacultyId}
              onChange={(event) => resetFilters(event.target.value)}
            >
              <option value="">Select faculty</option>
              {faculties.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>
                  {faculty.code} ({faculty.structureType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {selectedFaculty?.structureType === "year" ? "Year" : "Semester"}
            </label>
            <select
              className={selectClass}
              value={filterLevel}
              onChange={(event) => resetFilters(filterFacultyId, event.target.value)}
              disabled={!filterFacultyId}
            >
              <option value="">Select level</option>
              {levelOptions.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setCategory("general")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                category === "general"
                  ? "bg-white text-[var(--color-primary)] shadow-sm"
                  : "text-gray-600"
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setCategory("exam")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                category === "exam"
                  ? "bg-white text-[var(--color-primary)] shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Exam
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!filterFacultyId || !filterLevel ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          Select a faculty and semester/year first.
        </div>
      ) : category === "general" ? (
        <div className="space-y-6">
          <div className="flex gap-3 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-primary-strong)]">
            <Info className="h-5 w-5 shrink-0" />
            <p>
              General attendance is recorded by teachers during regular classes.
              Admin can review summaries here.
            </p>
          </div>

          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--color-primary)]" />
              Loading attendance...
            </div>
          ) : !generalClasses.length ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
              No teacher-marked attendance found for this class.
            </div>
          ) : (
            generalClasses.map((group) => (
              <div
                key={group.assignment.classOfferingId}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <h2 className="font-bold text-gray-900">
                    {group.assignment.facultyCode} ·{" "}
                    {group.assignment.levelLabel} · Batch{" "}
                    {group.assignment.batch}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {group.assignment.subjectName || "Class attendance"}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Student ID</th>
                        <th className="px-4 py-3 text-center">Present</th>
                        <th className="px-4 py-3 text-center">Absent</th>
                        <th className="px-4 py-3 text-center">%</th>
                        <th className="px-4 py-3">Recent logs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(group.students || []).map((student) => {
                        const summary =
                          group.summary?.find(
                            (item) => item.studentId === student._id,
                          ) || {};
                        const records = (group.records || []).filter(
                          (record) => record.studentId === student._id,
                        );
                        const expanded = expandedStudentId === student._id;

                        return (
                          <Fragment key={student._id}>
                            <tr className="border-t hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {student.name}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {student.studentId}
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-green-700">
                                {summary.present || 0}
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-red-700">
                                {summary.absent || 0}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="rounded-full bg-[var(--color-primary-bg)] px-2 py-1 text-xs font-bold text-[var(--color-primary-strong)]">
                                  {summary.percentage || 0}%
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedStudentId(
                                      expanded ? null : student._id,
                                    )
                                  }
                                  className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
                                >
                                  {expanded ? "Hide" : "View"} ({records.length})
                                </button>
                              </td>
                            </tr>
                            {expanded && (
                              <tr>
                                <td colSpan={6} className="bg-gray-50 px-4 py-3">
                                  {!records.length ? (
                                    <p className="text-sm text-gray-500">
                                      No daily logs for this student yet.
                                    </p>
                                  ) : (
                                    <ul className="space-y-2">
                                      {records.slice(0, 10).map((record) => (
                                        <li
                                          key={record.id}
                                          className="flex flex-wrap items-center gap-3 text-sm"
                                        >
                                          <Calendar className="h-4 w-4 text-gray-400" />
                                          <span className="font-medium text-gray-800">
                                            {record.date}
                                          </span>
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusBadge[record.status]}`}
                                          >
                                            {record.status}
                                          </span>
                                          {record.markedBy?.name && (
                                            <span className="text-gray-500">
                                              by {record.markedBy.name}
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Info className="h-5 w-5 shrink-0" />
            <p>
              Exam attendance uses the exam routine created in Exams. Select the
              term, then open each subject/date session and mark students present
              or absent.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Exam / term</label>
                <select
                  className={selectClass}
                  value={selectedExamId}
                  onChange={(event) => {
                    setSelectedExamId(event.target.value);
                    const nextExam = examsForClass.find(
                      (exam) => exam.examId === event.target.value,
                    );
                    setSelectedExamItemId(nextExam?.sessions[0]?.examItemId || "");
                  }}
                  disabled={!examsForClass.length || loading}
                >
                  <option value="">
                    {loading ? "Loading exams..." : "Select exam"}
                  </option>
                  {examsForClass.map((exam) => (
                    <option key={exam.examId} value={exam.examId}>
                      {exam.title} · Batch {exam.batch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Subject / exam day</label>
                <select
                  className={selectClass}
                  value={selectedExamItemId}
                  onChange={(event) => setSelectedExamItemId(event.target.value)}
                  disabled={!selectedExam?.sessions.length || loading}
                >
                  <option value="">Select subject session</option>
                  {(selectedExam?.sessions || []).map((session) => (
                    <option key={session.examItemId} value={session.examItemId}>
                      {session.subjectCode
                        ? `${session.subjectCode} - ${session.subjectName}`
                        : session.subjectName}{" "}
                      · {formatDate(session.date)} · {session.time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSession && (
              <div className="mt-5 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-primary-strong)]">
                <strong>{selectedSession.title}</strong> ·{" "}
                {selectedSession.subjectName} · {formatDate(selectedSession.date)}{" "}
                at {selectedSession.time} · Batch {selectedSession.batch}
              </div>
            )}
          </div>

          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--color-primary)]" />
              Loading exam attendance...
            </div>
          ) : !examsForClass.length ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
              No exam routine found for this faculty and semester/year.
            </div>
          ) : !examSessionData ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
              Select an exam and subject session to mark attendance.
            </div>
          ) : !examSessionData.students?.length ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
              No active students found for this exam batch.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div>
                  <h2 className="font-bold text-gray-900">
                    {examSessionData.session.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {examSessionData.session.subjectName} ·{" "}
                    {formatDate(examSessionData.session.date)} · Batch{" "}
                    {examSessionData.session.batch}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllExam(true)}
                  >
                    Mark all present
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllExam(false)}
                  >
                    Clear all
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-center">Present</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Roll no</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examSessionData.students.map((student) => {
                      const checked = Boolean(examChecks[student._id]);
                      return (
                        <tr
                          key={student._id}
                          className={`border-t ${checked ? "bg-green-50/50" : ""}`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setExamChecks((current) => ({
                                  ...current,
                                  [student._id]: event.target.checked,
                                }))
                              }
                              className="h-5 w-5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                              aria-label={`Present at exam for ${student.name}`}
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {student.studentId}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {student.rollNo || "--"}
                          </td>
                          <td className="px-4 py-3">
                            {checked ? (
                              <span className="inline-flex items-center gap-1 font-medium text-green-700">
                                <CheckCircle2 className="h-4 w-4" /> Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-red-600">
                                <XCircle className="h-4 w-4" /> Absent
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
                <p className="text-sm text-gray-600">
                  {presentExamStudents}/{totalExamStudents} marked present
                </p>
                <Button
                  variant="primary"
                  onClick={handleSaveExamAttendance}
                  disabled={loading}
                >
                  <ClipboardCheck className="mr-2 inline h-4 w-4" />
                  Save exam attendance
                </Button>
              </div>
            </div>
          )}

          {saveMessage && (
            <p className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {saveMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
