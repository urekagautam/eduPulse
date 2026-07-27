import { useEffect, useMemo, useState } from "react";
import {
  CalendarX,
  CheckCircle2,
  GraduationCap,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Button from "../../components/Button";
import {
  fetchTeacherAttendanceClass,
  fetchTeacherAttendanceContext,
  fetchTeacherAttendanceRecords,
  saveTeacherAttendance,
} from "../../services/apiAttendance";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const isWeekend = (dateString) => {
  const day = new Date(dateString).getDay();
  return day === 0 || day === 6;
};

const today = () => new Date().toISOString().split("T")[0];

export default function Attendance() {
  const [assignments, setAssignments] = useState([]);
  const [selectedClassOfferingId, setSelectedClassOfferingId] = useState("");
  const [classData, setClassData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendanceChecks, setAttendanceChecks] = useState({});
  const [loadingContext, setLoadingContext] = useState(true);
  const [loadingClass, setLoadingClass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [summarySearch, setSummarySearch] = useState("");

  const selectedAssignment = assignments.find(
    (assignment) => assignment.classOfferingId === selectedClassOfferingId,
  );

  useEffect(() => {
    const loadContext = async () => {
      setLoadingContext(true);
      setError("");
      try {
        const response = await fetchTeacherAttendanceContext();
        const nextAssignments = response?.data?.assignments || [];
        setAssignments(nextAssignments);
        if (nextAssignments.length) {
          setSelectedClassOfferingId(nextAssignments[0].classOfferingId);
        }
      } catch (err) {
        setAssignments([]);
        setError(err.message || "Failed to load assigned classes.");
      } finally {
        setLoadingContext(false);
      }
    };

    loadContext();
  }, []);

  useEffect(() => {
    const loadClass = async () => {
      if (!selectedClassOfferingId) {
        setClassData(null);
        setAttendanceChecks({});
        return;
      }

      setLoadingClass(true);
      setError("");
      setSaveMessage("");
      try {
        const response = await fetchTeacherAttendanceClass(
          selectedClassOfferingId,
        );
        setClassData(response?.data || null);
      } catch (err) {
        setClassData(null);
        setError(err.message || "Failed to load class students.");
      } finally {
        setLoadingClass(false);
      }
    };

    loadClass();
  }, [selectedClassOfferingId]);

  useEffect(() => {
    const loadAttendanceForDate = async () => {
      if (!selectedClassOfferingId || !selectedDate || !classData?.students) {
        setAttendanceChecks({});
        return;
      }

      setLoadingClass(true);
      setError("");
      try {
        const response = await fetchTeacherAttendanceRecords(
          selectedClassOfferingId,
          selectedDate,
        );
        const recordByStudent = new Map(
          (response?.data?.records || []).map((record) => [
            record.studentId,
            record,
          ]),
        );
        const checks = {};
        classData.students.forEach((student) => {
          checks[student._id] =
            recordByStudent.get(student._id)?.status === "present";
        });
        setAttendanceChecks(checks);
      } catch (err) {
        setAttendanceChecks({});
        setError(err.message || "Failed to load attendance for this date.");
      } finally {
        setLoadingClass(false);
      }
    };

    loadAttendanceForDate();
  }, [selectedClassOfferingId, selectedDate, classData?.students]);

  const selectedDateObj = new Date(selectedDate);
  const monthName = selectedDateObj.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const dayName = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const isSelectedDateWeekend = isWeekend(selectedDate);
  const isFutureDate =
    new Date(`${selectedDate}T00:00:00`) > new Date(`${today()}T00:00:00`);
  const isExamDay = useMemo(
    () =>
      (classData?.examSessions || []).some(
        (session) => session.date === selectedDate,
      ),
    [classData?.examSessions, selectedDate],
  );

  const students = classData?.students || [];
  const summaryByStudent = useMemo(() => {
    const map = new Map();
    (classData?.summary || []).forEach((item) => map.set(item.studentId, item));
    return map;
  }, [classData]);

  const attendanceRanking = useMemo(() => {
    const entries = students.map((student) => {
      const summary = summaryByStudent.get(student._id) || {
        present: 0,
        absent: 0,
        percentage: 0,
      };
      const total = Number(summary.present || 0) + Number(summary.absent || 0);
      const percentage =
        typeof summary.percentage === "number"
          ? summary.percentage
          : total > 0
            ? Math.round((Number(summary.present || 0) / total) * 100)
            : 0;

      return {
        student,
        summary,
        percentage,
        total,
      };
    });

    const sortedByAttendance = [...entries].sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if ((b.summary.present || 0) !== (a.summary.present || 0)) {
        return (b.summary.present || 0) - (a.summary.present || 0);
      }
      return (a.student.name || "").localeCompare(b.student.name || "");
    });

    const topStudents = sortedByAttendance.slice(0, 3).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    const bottomStudents = [...sortedByAttendance]
      .reverse()
      .slice(0, 3)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return { topStudents, bottomStudents };
  }, [students, summaryByStudent]);

  const filteredSummaryStudents = useMemo(() => {
    const query = summarySearch.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) =>
      (student.name || "").toLowerCase().includes(query),
    );
  }, [students, summarySearch]);

  const displayedSummaryStudents = summarySearch
    ? filteredSummaryStudents
    : filteredSummaryStudents.slice(0, 4);

  const presentCount = Object.values(attendanceChecks).filter(Boolean).length;

  const handleMarkAllPresent = () => {
    const checks = {};
    students.forEach((student) => {
      checks[student._id] = true;
    });
    setAttendanceChecks(checks);
  };

  const handleClearAll = () => {
    const checks = {};
    students.forEach((student) => {
      checks[student._id] = false;
    });
    setAttendanceChecks(checks);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassOfferingId || !selectedDate || !students.length) return;

    setSaving(true);
    setError("");
    setSaveMessage("");
    try {
      await saveTeacherAttendance(
        selectedClassOfferingId,
        selectedDate,
        students.map((student) => ({
          studentId: student._id,
          status: attendanceChecks[student._id] ? "present" : "absent",
        })),
      );

      const refreshed = await fetchTeacherAttendanceClass(
        selectedClassOfferingId,
      );
      setClassData(refreshed?.data || null);
      setSaveMessage(
        `Attendance saved for ${selectedDate}. Present: ${presentCount}/${students.length}`,
      );
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="mt-1 text-gray-600">
          Mark daily attendance for your assigned classes.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Select class</h2>

        {loadingContext ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
            Loading assigned classes...
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-gray-600">
            No active classes assigned to you yet. Contact admin.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <label className={labelClass}>Assigned class</label>
              <select
                className={selectClass}
                value={selectedClassOfferingId}
                onChange={(event) =>
                  setSelectedClassOfferingId(event.target.value)
                }
              >
                {assignments.map((assignment) => (
                  <option
                    key={assignment.classOfferingId}
                    value={assignment.classOfferingId}
                  >
                    {assignment.facultyCode} · {assignment.levelLabel} · Batch{" "}
                    {assignment.batch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Subjects in this class</label>
              <div className="min-h-12 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {selectedAssignment?.subjects?.length
                  ? selectedAssignment.subjects
                      .map((subject) =>
                        subject.subjectCode
                          ? `${subject.subjectCode} - ${subject.subjectName}`
                          : subject.subjectName,
                      )
                      .join(", ")
                  : "No subjects found"}
              </div>
            </div>
          </div>
        )}

        {selectedAssignment && (
          <p className="mt-3 text-sm text-gray-600">
            Showing: <strong>{selectedAssignment.facultyCode}</strong> ·{" "}
            {selectedAssignment.levelLabel} · Batch {selectedAssignment.batch}
          </p>
        )}
      </div>

      {!selectedClassOfferingId ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <GraduationCap className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">Select a class to mark attendance.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Select date
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setSaveMessage("");
                  }}
                />
              </div>
              <div className="flex items-end">
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">
                    <strong>Month:</strong> {monthName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Day:</strong> {dayName}
                  </p>
                </div>
              </div>
              <div className="flex items-end">
                {isExamDay ? (
                  <div className="w-full rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-green-900">
                      <ShieldCheck className="h-4 w-4" />
                      Exam day selected - attendance is managed by admin
                    </p>
                  </div>
                ) : isSelectedDateWeekend ? (
                  <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                      <CalendarX className="h-4 w-4" />
                      Weekend selected - you can still update saved attendance
                      if needed
                    </p>
                  </div>
                ) : (
                  <div className="w-full rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm font-medium text-green-900">
                      Regular class day - mark or update attendance
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isFutureDate && (
            <div className="space-y-4">
              <div
                className={`flex gap-3 rounded-lg px-4 py-3 text-sm ${
                  isExamDay
                    ? "border border-green-200 bg-green-50 text-green-900"
                    : "border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]"
                }`}
              >
                <Info className="h-5 w-5 shrink-0" />
                <p>
                  {isExamDay
                    ? "This is an exam day, so attendance is marked by the admin and cannot be edited by teachers."
                    : "Select a date and update the attendance list as needed."}
                </p>
              </div>

              {isExamDay ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  <p className="font-medium">
                    Attendance for this date is locked for teachers.
                  </p>
                  <p className="mt-1">
                    Any attendance on exam days is handled from the admin side.
                  </p>
                </div>
              ) : loadingClass ? (
                <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
                  <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--color-primary)]" />
                  Loading attendance...
                </div>
              ) : students.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
                  No active students in this class.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllPresent}
                    >
                      Mark all present
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                    >
                      Clear all
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            <th className="w-12 px-4 py-3 text-center font-semibold text-gray-700">
                              Present
                            </th>
                            <th className="px-4 py-3 font-semibold text-gray-700">
                              Student
                            </th>
                            <th className="px-4 py-3 font-semibold text-gray-700">
                              Student ID
                            </th>
                            <th className="px-4 py-3 font-semibold text-gray-700">
                              Roll no
                            </th>
                            <th className="px-4 py-3 font-semibold text-gray-700">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => {
                            const checked = Boolean(
                              attendanceChecks[student._id],
                            );
                            return (
                              <tr
                                key={student._id}
                                className={`border-b border-gray-100 ${
                                  checked ? "bg-green-50/50" : ""
                                }`}
                              >
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      setAttendanceChecks((current) => ({
                                        ...current,
                                        [student._id]: event.target.checked,
                                      }))
                                    }
                                    className="h-5 w-5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                    aria-label={`Present for ${student.name}`}
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
                                      <CheckCircle2 className="h-4 w-4" />
                                      Present
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 font-medium text-red-600">
                                      <XCircle className="h-4 w-4" />
                                      Absent
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-4">
                      <p className="text-sm text-gray-600">
                        Total present today: <strong>{presentCount}</strong> /{" "}
                        {students.length}
                      </p>
                      <Button
                        variant="primary"
                        onClick={handleSaveAttendance}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save attendance"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {saveMessage && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {saveMessage}
            </p>
          )}

          {students.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-bold text-gray-900">
                Class attendance summary
              </h3>

              <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-green-900">
                      Top 3 most attending
                    </h4>
                    <span className="text-xs font-medium uppercase tracking-wide text-green-700">
                      Best attendance
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {attendanceRanking.topStudents.map((entry) => (
                      <li
                        key={entry.student._id}
                        className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2"
                      >
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">
                            {entry.rank}
                          </span>
                          <span className="font-medium text-gray-900">
                            {entry.student.name}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-green-700">
                          {entry.percentage}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-red-900">
                      Bottom 3 least attending
                    </h4>
                    <span className="text-xs font-medium uppercase tracking-wide text-red-700">
                      Needs attention
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {attendanceRanking.bottomStudents.map((entry) => (
                      <li
                        key={`${entry.student._id}-${entry.rank}`}
                        className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2"
                      >
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white">
                            {entry.rank}
                          </span>
                          <span className="font-medium text-gray-900">
                            {entry.student.name}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-red-700">
                          {entry.percentage}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mb-4 w-full max-w-[50%]">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Search student
                </label>
                <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus-within:border-[var(--color-primary-border)] focus-within:ring-2 focus-within:ring-[var(--color-primary-bg)]">
                  <Search className="mr-2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={summarySearch}
                    onChange={(event) => setSummarySearch(event.target.value)}
                    placeholder="Search student"
                    className="w-full border-none bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              {!summarySearch && filteredSummaryStudents.length > 4 && (
                <p className="mb-4 text-sm text-gray-500">
                  Showing the first 4 students. Search for a specific student to
                  view their full attendance stats.
                </p>
              )}

              {displayedSummaryStudents.length === 0 ? (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  No student found for "{summarySearch}".
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {displayedSummaryStudents.map((student) => {
                    const summary = summaryByStudent.get(student._id) || {
                      present: 0,
                      absent: 0,
                      percentage: 0,
                    };
                    return (
                      <div
                        key={student._id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                      >
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                          {student.name}
                        </p>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-700">
                            Present:{" "}
                            <span className="font-semibold text-green-700">
                              {summary.present}
                            </span>
                          </p>
                          <p className="text-gray-700">
                            Absent:{" "}
                            <span className="font-semibold text-red-700">
                              {summary.absent}
                            </span>
                          </p>
                          <p className="text-gray-700">
                            %:{" "}
                            <span className="font-semibold">
                              {summary.percentage}%
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
