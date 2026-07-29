import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  TrendingUp,
  RefreshCw,
  User,
} from "lucide-react";
import { fetchStudentPerformanceDetail } from "../../../services/apiPerformance";

const cardClass = "rounded-lg border border-gray-200 bg-white p-6 shadow-sm";
const emptyClass =
  "rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500";

const formatValue = (value, fallback = "--") =>
  value == null || value === "" ? fallback : value;

const formatDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
};

const percentText = (value) => (value == null ? "--" : `${value}%`);

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[var(--color-primary-bg)] p-2 text-[var(--color-primary)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
      {detail && <p className="mt-3 text-xs text-gray-500">{detail}</p>}
    </div>
  );
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "present" || normalized === "submitted" || normalized === "passed") {
    return "border-green-100 bg-green-50 text-green-700";
  }
  if (normalized === "absent" || normalized === "failed") {
    return "border-red-100 bg-red-50 text-red-700";
  }
  if (normalized === "incomplete" || normalized === "pending") {
    return "border-yellow-100 bg-yellow-50 text-yellow-800";
  }
  return "border-gray-100 bg-gray-50 text-gray-600";
}

function riskClass(color) {
  if (color === "red") return "border-red-100 bg-red-50 text-red-700";
  if (color === "yellow") return "border-yellow-100 bg-yellow-50 text-yellow-800";
  if (color === "blue") return "border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]";
  if (color === "green") return "border-green-100 bg-green-50 text-green-700";
  return "border-gray-100 bg-gray-50 text-gray-600";
}

export default function StudentPerformanceDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchStudentPerformanceDetail(studentId);
        setDetail(response?.data || null);
      } catch (err) {
        setError(err.message || "Failed to load student performance.");
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [studentId]);

  useEffect(() => {
    if (!detail?.exams?.length) {
      setSelectedExamId("");
      return;
    }

    if (!detail.exams.some((exam) => exam.exam.id === selectedExamId)) {
      setSelectedExamId(detail.exams[detail.exams.length - 1].exam.id);
    }
  }, [detail, selectedExamId]);

  const latestExam = useMemo(() => {
    const exams = detail?.exams || [];
    return [...exams].reverse().find((exam) => exam.percentage != null) || null;
  }, [detail]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
        <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--color-primary)]" />
        Loading student details...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-red-700">
          {error || "Student detail not found."}
        </div>
      </div>
    );
  }

  const { student, attendance, examAttendance, quizzes } = detail;
  const prediction = detail.prediction;
  const knnCategories = [
    { label: "At Risk", color: "red" },
    { label: "Average", color: "yellow" },
    { label: "Good", color: "blue" },
    { label: "Excellent", color: "green" },
  ];
  const selectedExam = detail.exams.find(
    (exam) => exam.exam.id === selectedExamId,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
        >
          <ArrowLeft className="h-5 w-5" /> Back to students
        </button>
        <div className="text-left md:text-right">
          <h1 className="text-3xl font-bold text-gray-900">
            Student Performance
          </h1>
          <p className="text-sm text-gray-500">
            Current semester academic, attendance, and quiz record
          </p>
        </div>
      </div>

      <section className={cardClass}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {student.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {student.studentId} · @{student.username}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-strong)]">
                  {student.admission.facultyCode} ·{" "}
                  {student.enrollment.currentLevelLabel}
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  Batch {student.admission.batch}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2 lg:min-w-[360px]">
            <p>
              <span className="font-semibold text-gray-800">Email:</span>{" "}
              {formatValue(student.profile.email)}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Mobile:</span>{" "}
              {formatValue(student.profile.mobile)}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Roll no:</span>{" "}
              {formatValue(student.rollNo)}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Guardian:</span>{" "}
              {formatValue(student.guardian.name)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarCheck}
          label="Class attendance"
          value={percentText(attendance.overall.percentage)}
          detail={`${attendance.overall.present}/${attendance.overall.total} present`}
        />
        <StatCard
          icon={ClipboardList}
          label="Exam attendance"
          value={percentText(examAttendance.overall.percentage)}
          detail={`${examAttendance.overall.present}/${examAttendance.overall.total} present`}
        />
        <StatCard
          icon={FileQuestion}
          label="Quiz average"
          value={percentText(quizzes.overall.percentage)}
          detail={`${quizzes.overall.submitted}/${quizzes.overall.total} submitted`}
        />
        <StatCard
          icon={GraduationCap}
          label="Latest exam"
          value={percentText(latestExam?.percentage)}
          detail={latestExam?.exam?.title || "No entered exam marks yet"}
        />
      </div>

      <section className={cardClass}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[var(--color-primary-bg)] p-2 text-[var(--color-primary)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Final Exam Prediction
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Based on current semester marks, attendance, quiz score, and weighted exam priority.
              </p>
            </div>
          </div>

          {prediction?.available ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-2xl font-bold text-gray-900">
                {percentText(prediction.predictedFinalPercent)}
              </span>
            </div>
          ) : (
            <span className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600">
              Not enough data
            </span>
          )}
        </div>

        {prediction?.available ? (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Class attendance", prediction.features?.classAttendancePercent],
                ["Weighted exam attendance", prediction.features?.weightedExamAttendanceScore],
                ["Weighted exam marks", prediction.features?.weightedExamPercent],
                ["Quiz score", prediction.features?.quizPercent],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {percentText(value)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              {prediction.algorithm} · {prediction.trainedSampleCount || 0} labelled rows ·{" "}
              {prediction.note}
            </p>
            {prediction.knnClassification?.available && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      K-Nearest Neighbors Classification
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Risk category classified from nearest labelled student records.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {knnCategories.map((category) => {
                        const isActive =
                          prediction.knnClassification.riskCategory?.label ===
                          category.label;
                        return (
                          <div
                            key={category.label}
                            className={`min-w-24 rounded-lg border px-3 py-2 text-center text-sm font-bold ${
                              isActive
                                ? `${riskClass(category.color)} ring-2 ring-green-500 ring-offset-1`
                                : "border-gray-200 bg-gray-50 text-gray-400"
                            }`}
                          >
                            {category.label}
                          </div>
                        );
                      })}
                    </div>
                    <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                      {percentText(
                        prediction.knnClassification.confidencePercent,
                      )}{" "}
                      confidence
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  {prediction.knnClassification.algorithm} - K ={" "}
                  {prediction.knnClassification.k} -{" "}
                  {prediction.knnClassification.trainedSampleCount || 0} labelled rows -{" "}
                  {prediction.knnClassification.note}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className={emptyClass}>
            Prediction will appear after enough current semester marks, attendance, and quiz data exist.
          </div>
        )}
      </section>

      <section className={cardClass}>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-gray-900">Exam Marks</h2>
          </div>
          {detail.exams.length > 0 && (
            <select
              value={selectedExamId}
              onChange={(event) => setSelectedExamId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] md:w-72"
            >
              {detail.exams.map((exam) => (
                <option key={exam.exam.id} value={exam.exam.id}>
                  {exam.exam.title}
                </option>
              ))}
            </select>
          )}
        </div>
        {!detail.exams.length ? (
          <div className={emptyClass}>No exams created for this current semester.</div>
        ) : (
          <div className="space-y-5">
            {[selectedExam].filter(Boolean).map((exam) => (
              <div key={exam.exam.id} className="rounded-lg border border-gray-200">
                <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {exam.exam.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {exam.enteredSubjectCount}/{exam.subjectCount} subject marks entered
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(exam.status)}`}
                  >
                    {exam.status} · {percentText(exam.percentage)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-gray-700">
                    <thead className="text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Marks</th>
                        <th className="px-4 py-3">%</th>
                        <th className="px-4 py-3">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.subjectResults.map((subject) => (
                        <tr key={subject.subjectId} className="border-t">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {subject.subjectCode
                              ? `${subject.subjectCode} - ${subject.subjectName}`
                              : subject.subjectName}
                          </td>
                          <td className="px-4 py-3">
                            {subject.absent
                              ? "Absent"
                              : subject.obtainedMarks == null
                                ? "--"
                                : `${subject.obtainedMarks}/${subject.fullMarks}`}
                          </td>
                          <td className="px-4 py-3">
                            {subject.absent ? "--" : percentText(subject.percentage)}
                          </td>
                          <td className="px-4 py-3">{subject.absent ? "--" : formatValue(subject.grade)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={cardClass}>
          <div className="mb-5 flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-gray-900">Class Attendance</h2>
          </div>
          {!attendance.bySubject.length ? (
            <div className={emptyClass}>No attendance records found.</div>
          ) : (
            <div className="space-y-3">
              {attendance.bySubject.map((item) => (
                <div
                  key={item.subjectId}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {item.subjectCode
                        ? `${item.subjectCode} - ${item.subjectName}`
                        : item.subjectName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.present}/{item.total} present
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {percentText(item.percentage)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={cardClass}>
          <div className="mb-5 flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-gray-900">Exam Attendance</h2>
          </div>
          {!examAttendance.records.length ? (
            <div className={emptyClass}>No exam attendance marked yet.</div>
          ) : (
            <div className="space-y-3">
              {examAttendance.records.map((record) => (
                <div
                  key={`${record.examId}-${record.subjectId}-${record.date}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {record.examTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {record.subjectCode
                        ? `${record.subjectCode} - ${record.subjectName}`
                        : record.subjectName}{" "}
                      · {formatDate(record.date)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(record.status)}`}
                  >
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={cardClass}>
        <div className="mb-5 flex items-center gap-3">
          <FileQuestion className="h-5 w-5 text-[var(--color-primary)]" />
          <h2 className="text-xl font-bold text-gray-900">Quizzes</h2>
        </div>
        {!quizzes.records.length ? (
          <div className={emptyClass}>No published quizzes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.records.map((quiz) => (
                  <tr key={quiz.quizId} className="border-t">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {quiz.title}
                    </td>
                    <td className="px-4 py-3">
                      {quiz.subjectCode
                        ? `${quiz.subjectCode} - ${quiz.subjectName}`
                        : quiz.subjectName}
                    </td>
                    <td className="px-4 py-3">
                      {quiz.obtainedMarks == null
                        ? "--"
                        : `${quiz.obtainedMarks}/${quiz.fullMarks}`}
                    </td>
                    <td className="px-4 py-3">{percentText(quiz.percentage)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass(quiz.status)}`}
                      >
                        {quiz.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
