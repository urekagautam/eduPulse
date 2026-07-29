import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import { fetchStudentAcademics } from "../../services/apiExam";

const cardClass = "rounded-lg border border-gray-200 bg-white p-5 shadow-sm";

const statusClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "passed")
    return "border-green-100 bg-green-50 text-green-700";
  if (normalized === "failed") return "border-red-100 bg-red-50 text-red-700";
  if (normalized === "absent")
    return "border-yellow-100 bg-yellow-50 text-yellow-800";
  if (normalized === "pending")
    return "border-gray-100 bg-gray-50 text-gray-600";
  return "border-gray-100 bg-gray-50 text-gray-600";
};

const rowClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "passed") return "bg-green-50/50";
  if (normalized === "failed") return "bg-red-50";
  if (normalized === "absent") return "bg-yellow-50";
  return "bg-white";
};

const formatDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatMarks = (value) =>
  value == null ? "--" : Number(value).toString();

export default function Academics() {
  const [activeTab, setActiveTab] = useState("routine");
  const [academics, setAcademics] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAcademics = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchStudentAcademics();
        const data = response?.data || null;
        setAcademics(data);
        setSelectedExamId(data?.exams?.[0]?.id || "");
      } catch (err) {
        setAcademics(null);
        setError(err.message || "Failed to load academics.");
      } finally {
        setLoading(false);
      }
    };

    loadAcademics();
  }, []);

  const exams = useMemo(() => academics?.exams || [], [academics]);
  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId) || exams[0] || null,
    [exams, selectedExamId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academics</h1>
          <p className="mt-1 text-gray-600">
            View your exam routine and result marksheet for the current
            semester.
          </p>
        </div>
        {academics?.classInfo && (
          <div className="rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)]">
            {academics.classInfo.facultyCode} · {academics.classInfo.levelLabel}{" "}
            · Batch {academics.classInfo.batch}
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
          <p className="text-center text-gray-600">Loading academics...</p>
        </div>
      ) : (
        <>
          <div className="flex w-fit rounded-lg bg-gray-200/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("routine")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                activeTab === "routine"
                  ? "bg-white text-[var(--color-primary-strong)] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Exam Routine
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("result")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                activeTab === "result"
                  ? "bg-white text-[var(--color-primary-strong)] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Result
            </button>
          </div>

          {!exams.length ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              No exam routine or result has been created for your current
              semester.
            </div>
          ) : activeTab === "routine" ? (
            <section className="space-y-4">
              <div className={cardClass}>
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Exam Routine
                    </h2>
                    <p className="text-sm text-gray-500">
                      Latest exam is selected by default. Previous exams are
                      available from the list.
                    </p>
                  </div>
                  <select
                    value={selectedExam?.id || ""}
                    onChange={(event) => setSelectedExamId(event.target.value)}
                    className="rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedExam?.notice && (
                  <div className="mb-4 rounded-2xl border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-primary)]">
                    <span className="font-bold">Note:</span>{" "}
                    {selectedExam.notice}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <CalendarDays className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
                    <p className="text-sm text-gray-500">Exam</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {selectedExam?.title}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <ClipboardList className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
                    <p className="text-sm text-gray-500">Full marks</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {selectedExam?.fullMarks}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <GraduationCap className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
                    <p className="text-sm text-gray-500">Pass marks</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {selectedExam?.passMarks}
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Subject</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedExam?.items || []).map((item) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatDate(item.date)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {item.time}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {item.subjectCode
                              ? `${item.subjectCode} - ${item.subject}`
                              : item.subject}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <section className={cardClass}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Result Marksheet
                  </h2>
                  <p className="text-sm text-gray-500">
                    Marks are shown according to exam attendance and
                    teacher-entered marks.
                  </p>
                </div>
                <select
                  value={selectedExam?.id || ""}
                  onChange={(event) => setSelectedExamId(event.target.value)}
                  className="rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="font-bold text-gray-900">
                    {selectedExam?.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedExam?.result?.enteredSubjectCount}/
                    {selectedExam?.result?.subjectCount} subject marks entered
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                    selectedExam?.result?.status,
                  )}`}
                >
                  {selectedExam?.result?.status} ·{" "}
                  {selectedExam?.result?.percentage == null
                    ? "--"
                    : `${selectedExam.result.percentage}%`}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3">Pass</th>
                      <th className="px-4 py-3">Full</th>
                      <th className="px-4 py-3">%</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedExam?.subjects || []).map((subject) => (
                      <tr
                        key={subject.subjectId}
                        className={`border-t border-gray-100 ${rowClass(subject.status)}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {subject.subjectCode
                            ? `${subject.subjectCode} - ${subject.subjectName}`
                            : subject.subjectName}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {subject.status === "absent"
                            ? "--"
                            : formatMarks(subject.obtainedMarks)}
                        </td>
                        <td className="px-4 py-3">{subject.passMarks}</td>
                        <td className="px-4 py-3">{subject.fullMarks}</td>
                        <td className="px-4 py-3">
                          {subject.percentage == null
                            ? "--"
                            : `${subject.percentage}%`}
                        </td>
                        <td className="px-4 py-3">{subject.grade || "--"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                              subject.status,
                            )}`}
                          >
                            {subject.remark}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedExam?.notice && (
                <div className="mt-4 rounded-2xl border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-primary)]">
                  <FileText className="mr-2 inline h-4 w-4" />
                  <span className="font-bold">Exam note:</span>{" "}
                  {selectedExam.notice}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
