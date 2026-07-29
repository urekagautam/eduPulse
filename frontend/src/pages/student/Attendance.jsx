import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ClipboardList,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { fetchStudentAttendanceSummary } from "../../services/apiAttendance";

const cardClass = "rounded-lg border border-gray-200 bg-white p-5 shadow-sm";
const statusClass = {
  present: "border-green-100 bg-green-50 text-green-700",
  absent: "border-red-100 bg-red-50 text-red-700",
};

const metric = (value) => `${Number(value || 0).toFixed(1)}%`;

const formatDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function SummaryCard({ icon: Icon, label, value, detail, tone = "blue" }) {
  const tones = {
    blue: "bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-3 ${tones[tone] || tones.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function Attendance() {
  const [activeTab, setActiveTab] = useState("class");
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const [classDateFilter, setClassDateFilter] = useState("");
  const [classStatusFilter, setClassStatusFilter] = useState("");

  useEffect(() => {
    const loadAttendance = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchStudentAttendanceSummary();
        setAttendance(response?.data || null);
      } catch (err) {
        setAttendance(null);
        setError(err.message || "Failed to load attendance.");
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, []);

  const classSummary = attendance?.classAttendance?.summary || {
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
  };
  const examSummary = attendance?.examAttendance?.summary || {
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
  };

  const examTitles = useMemo(() => {
    const titles = new Set();
    (attendance?.examAttendance?.records || []).forEach((record) => {
      if (record.examTitle) titles.add(record.examTitle);
    });
    return [...titles];
  }, [attendance]);

  const filteredExamRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (attendance?.examAttendance?.records || []).filter((record) => {
      if (examFilter && record.examTitle !== examFilter) return false;
      if (!query) return true;
      return [
        record.examTitle,
        record.subjectName,
        record.subjectCode,
        record.status,
        record.date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [attendance, examFilter, search]);

  const classRecords = attendance?.classAttendance?.records || [];
  const filteredClassRecords = useMemo(
    () =>
      classRecords.filter((record) => {
        if (classDateFilter && record.date !== classDateFilter) return false;
        if (classStatusFilter && record.status !== classStatusFilter) return false;
        return true;
      }),
    [classDateFilter, classRecords, classStatusFilter],
  );
  const presentDash = classSummary.total
    ? (classSummary.present / classSummary.total) * 283
    : 0;
  const absentDash = classSummary.total
    ? (classSummary.absent / classSummary.total) * 283
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-gray-600">
            Current semester class attendance and subject-wise exam attendance.
          </p>
        </div>
        {attendance?.classInfo && (
          <div className="rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-strong)]">
            {attendance.classInfo.facultyCode} · {attendance.classInfo.levelLabel} · Batch{" "}
            {attendance.classInfo.batch}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className={cardClass}>
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--color-primary)]" />
          <p className="text-center text-gray-600">Loading attendance...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              icon={CalendarCheck}
              label="Class attendance"
              value={metric(classSummary.percentage)}
              detail={`${classSummary.present}/${classSummary.total} present`}
              tone="blue"
            />
            <SummaryCard
              icon={UserCheck}
              label="Class present"
              value={classSummary.present}
              detail="Teacher-marked classes"
              tone="green"
            />
            <SummaryCard
              icon={ClipboardList}
              label="Exam attendance"
              value={metric(examSummary.percentage)}
              detail={`${examSummary.present}/${examSummary.total} present`}
              tone="blue"
            />
            <SummaryCard
              icon={UserX}
              label="Exam absent"
              value={examSummary.absent}
              detail="Subject exam sessions"
              tone="red"
            />
          </div>

          <div className="flex w-fit rounded-lg bg-gray-200/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("class")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                activeTab === "class"
                  ? "bg-white text-[var(--color-primary-strong)] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Class Attendance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("exam")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                activeTab === "exam"
                  ? "bg-white text-[var(--color-primary-strong)] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Exam Attendance
            </button>
          </div>

          {activeTab === "class" ? (
            <section className={cardClass}>
              <div className="mb-5 grid gap-5 lg:grid-cols-[260px_1fr] lg:items-center">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="relative mx-auto h-44 w-44">
                    <svg viewBox="0 0 120 120" className="h-44 w-44 -rotate-90">
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke="#fee2e2"
                        strokeWidth="14"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="14"
                        strokeDasharray={`${absentDash} ${283 - absentDash}`}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="14"
                        strokeDasharray={`${presentDash} ${283 - presentDash}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-bold text-gray-900">
                        {metric(classSummary.percentage)}
                      </p>
                      <p className="text-xs font-semibold text-gray-500">Present</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-green-50 px-3 py-2 text-green-700">
                      <p className="font-bold">{classSummary.present}</p>
                      <p>Present</p>
                    </div>
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                      <p className="font-bold">{classSummary.absent}</p>
                      <p>Absent</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gray-900">Class Attendance Records</h2>
                  <p className="text-sm text-gray-500">
                    One class attendance is counted per date for your current semester.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="date"
                      value={classDateFilter}
                      onChange={(event) => setClassDateFilter(event.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <select
                      value={classStatusFilter}
                      onChange={(event) => setClassStatusFilter(event.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="">All status</option>
                      <option value="present">Present only</option>
                      <option value="absent">Absent only</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setClassDateFilter("");
                        setClassStatusFilter("");
                      }}
                      className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              {!classRecords.length ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No class attendance records found.
                </div>
              ) : !filteredClassRecords.length ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No class attendance records match the selected filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Marked by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClassRecords.map((record) => (
                        <tr key={record.id} className="border-t border-gray-100">
                          <td className="px-3 py-3 font-medium text-gray-900">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass[record.status]}`}
                            >
                              {record.status === "present" ? "Present" : "Absent"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-600">
                            {record.markedBy?.name || "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section className={cardClass}>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Exam Attendance Records</h2>
                  <p className="text-sm text-gray-500">
                    Present and absent records are shown separately for each exam subject.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={examFilter}
                    onChange={(event) => setExamFilter(event.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="">All exams</option>
                    {examTitles.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search subject or status"
                      className="rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              {!filteredExamRecords.length ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No exam attendance records found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExamRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-bold text-gray-900">
                          {record.subjectCode
                            ? `${record.subjectCode} - ${record.subjectName}`
                            : record.subjectName}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {record.examTitle} · {formatDate(record.date)}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full border px-4 py-1.5 text-sm font-bold ${statusClass[record.status]}`}
                      >
                        {record.status === "present" ? "Present" : "Absent"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
