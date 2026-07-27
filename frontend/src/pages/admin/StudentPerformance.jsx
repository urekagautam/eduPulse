import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, RefreshCw } from "lucide-react";
import { fetchFaculties } from "../../services/apiFaculty";
import { fetchPerformanceLedger } from "../../services/apiPerformance";

const fieldClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const getLevelOptions = (faculty) => {
  if (!faculty) return [];
  if (Array.isArray(faculty.levels) && faculty.levels.length) {
    return faculty.levels;
  }

  const max = Math.max(Number(faculty.maxLevel) || 1, 1);
  return Array.from({ length: max }, (_, index) => ({
    value: index + 1,
    label: `${faculty.structureType === "year" ? "Year" : "Semester"} ${index + 1}`,
  }));
};

const formatMark = (value) => (value == null ? "--" : value);
const formatGpa = (value) => (value == null ? "--" : Number(value).toFixed(2));
const pendingText = "Pending";

const statusClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "passed") return "bg-green-50 text-green-700 border-green-100";
  if (normalized === "absent") return "bg-yellow-50 text-yellow-800 border-yellow-100";
  if (normalized === "failed") return "bg-red-50 text-red-700 border-red-100";
  if (normalized === "incomplete") return "bg-yellow-50 text-yellow-800 border-yellow-100";
  return "bg-gray-50 text-gray-600 border-gray-100";
};

const isFailedSubject = (subjectResult) => {
  if (subjectResult?.passed === false) return true;
  if (subjectResult?.passed === true) return false;
  if (subjectResult?.obtainedMarks == null) return false;

  const obtainedMarks = Number(subjectResult?.obtainedMarks);
  const passMarks = Number(subjectResult?.passMarks ?? 0);
  if (Number.isNaN(obtainedMarks) || Number.isNaN(passMarks)) {
    return false;
  }

  return obtainedMarks < passMarks;
};

const subjectCellClass = (subjectResult) => {
  if (subjectResult?.obtainedMarks == null) {
    return "bg-yellow-50 text-yellow-900";
  }
  if (subjectResult?.passed) {
    return "bg-emerald-50 text-emerald-800";
  }
  if (isFailedSubject(subjectResult)) {
    return "bg-red-50 text-red-700";
  }
  return "bg-white text-slate-700";
};

export default function StudentPerformance() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [faculties, setFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedFaculty = faculties.find(
    (faculty) => faculty._id === selectedFacultyId,
  );
  const levelOptions = useMemo(
    () => getLevelOptions(selectedFaculty),
    [selectedFaculty],
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
        if (nextFaculties.length) {
          const requestedFaculty = searchParams.get("facultyId");
          const firstFaculty =
            nextFaculties.find((faculty) => faculty._id === requestedFaculty) ||
            nextFaculties[0];
          setSelectedFacultyId(firstFaculty._id);
          setSelectedLevel(
            searchParams.get("level") ||
              String(getLevelOptions(firstFaculty)[0]?.value || ""),
          );
          setSelectedBatch(searchParams.get("batch") || "");
          setSelectedExamId(searchParams.get("examId") || "");
        }
      } catch (err) {
        setError(err.message || "Failed to load faculties.");
      }
    };

    loadFaculties();
  }, [searchParams]);

  useEffect(() => {
    if (!selectedFaculty) return;
    const levels = getLevelOptions(selectedFaculty);
    if (!levels.some((item) => String(item.value) === String(selectedLevel))) {
      setSelectedLevel(String(levels[0]?.value || ""));
      setSelectedBatch("");
      setSelectedExamId("");
    }
  }, [selectedFaculty, selectedLevel]);

  useEffect(() => {
    const loadLedger = async () => {
      if (!selectedFacultyId || !selectedLevel) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetchPerformanceLedger({
          facultyId: selectedFacultyId,
          level: selectedLevel,
          batch: selectedBatch,
          examId: selectedExamId,
        });
        const data = response?.data || null;
        setLedger(data);
        if (data?.batch && data.batch !== selectedBatch) setSelectedBatch(data.batch);
        if (data?.currentExam?.id && data.currentExam.id !== selectedExamId) {
          setSelectedExamId(data.currentExam.id);
        }
      } catch (err) {
        setLedger(null);
        setError(err.message || "Failed to load performance ledger.");
      } finally {
        setLoading(false);
      }
    };

    loadLedger();
  }, [selectedFacultyId, selectedLevel, selectedBatch, selectedExamId]);

  const rows = ledger?.rows || [];
  const subjects = ledger?.subjects || [];
  const exams = ledger?.exams || [];
  const currentExam = ledger?.currentExam;
  const currentStudentRow = studentId
    ? rows.find((row) => row.student.studentId === studentId)
    : null;
  const viewQuery = new URLSearchParams({
    facultyId: selectedFacultyId,
    level: selectedLevel,
    batch: selectedBatch,
    examId: selectedExamId,
  }).toString();

  const summary = useMemo(() => {
    const withGpa = rows.filter((row) => row.complete && row.gpa != null);
    if (!withGpa.length) return null;
    const avg =
      withGpa.reduce((sum, row) => sum + Number(row.gpa), 0) / withGpa.length;
    return {
      students: rows.length,
      subjects: subjects.length,
      averageGpa: avg,
      complete: rows.filter((row) => row.complete).length,
    };
  }, [rows, subjects.length]);

  if (studentId) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => navigate("/admin/student-performance")}
            className="inline-flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
          >
            <ArrowLeft className="w-5 h-5" /> Back to result ledger
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Result and Performance
            </h1>
            <p className="text-sm text-gray-500">
              Student mark sheet and terminal summary
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
            Loading result...
          </div>
        ) : !currentStudentRow ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-red-700">
            Student result not found in the selected active class.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="grid gap-6 lg:grid-cols-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Student
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {currentStudentRow.student.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ID: {currentStudentRow.student.studentId}
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Class
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {ledger?.faculty?.code} {ledger?.levelLabel}
                  </p>
                  <p className="text-sm text-gray-600">Batch {ledger?.batch}</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Exam
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {currentExam?.title || "No exam selected"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Rank {currentStudentRow.complete ? currentStudentRow.rank : pendingText}
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-500">
                    Cumulative GPA
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {currentStudentRow.complete
                      ? formatGpa(currentStudentRow.cumulativeGpa)
                      : pendingText}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentStudentRow.termCount || 0} term(s)
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Marksheet
                  </h2>
                  <p className="text-sm text-gray-500">
                    Subject marks entered by assigned teachers.
                  </p>
                </div>
                <div
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold ${statusClass(currentStudentRow.status)}`}
                >
                  {currentStudentRow.status}
                </div>
              </div>

              <div className="ledger-scroll overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-sm text-gray-700">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3">%</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">GPA</th>
                      <th className="px-4 py-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStudentRow.subjectResults.map((item) => (
                      <tr
                        key={item.subjectId}
                        className={item.passed === false ? "bg-red-50" : "bg-white"}
                      >
                        <td className="border-t px-4 py-3 font-medium">
                          {item.subjectCode
                            ? `${item.subjectCode} - ${item.subjectName}`
                            : item.subjectName}
                        </td>
                        <td className="border-t px-4 py-3 font-semibold">
                          {item.absent || item.obtainedMarks == null
                            ? "--"
                            : `${formatMark(item.obtainedMarks)}/${item.fullMarks}`}
                        </td>
                        <td className="border-t px-4 py-3">
                          {item.percentage == null ? "--" : `${item.percentage}%`}
                        </td>
                        <td className="border-t px-4 py-3">{item.grade || "--"}</td>
                        <td className="border-t px-4 py-3">
                          {formatGpa(item.gradePoint)}
                        </td>
                        <td className="border-t px-4 py-3">{item.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!currentStudentRow.complete && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  GPA, percentage, rank, and cumulative GPA will appear after all
                  subject marks are entered for this exam.
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Total marks</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {currentStudentRow.complete
                      ? `${currentStudentRow.total}/${currentStudentRow.fullMarks}`
                      : pendingText}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Percentage</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {currentStudentRow.percentage == null
                      ? pendingText
                      : `${currentStudentRow.percentage}%`}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Term GPA</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {currentStudentRow.complete
                      ? formatGpa(currentStudentRow.gpa)
                      : pendingText}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Rank</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {currentStudentRow.complete ? currentStudentRow.rank : pendingText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Result and Performance
          </h1>
          <p className="text-sm text-gray-500">
            Review teacher-entered marks, GPA, rank, and cumulative performance.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Current view</div>
          <div className="mt-2 text-lg font-semibold text-gray-900">
            {ledger?.faculty?.code || selectedFaculty?.code || "Faculty"} -{" "}
            {ledger?.levelLabel || "Semester/year"}
          </div>
          <div className="text-sm text-gray-500">
            Batch {ledger?.batch || selectedBatch || "--"}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelClass}>Faculty</label>
            <select
              value={selectedFacultyId}
              onChange={(event) => {
                const facultyId = event.target.value;
                const faculty = faculties.find((item) => item._id === facultyId);
                setSelectedFacultyId(facultyId);
                setSelectedLevel(String(getLevelOptions(faculty)[0]?.value || ""));
                setSelectedBatch("");
                setSelectedExamId("");
              }}
              className={fieldClass}
            >
              {faculties.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>
                  {faculty.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {selectedFaculty?.structureType === "year" ? "Year" : "Semester"}
            </label>
            <select
              value={selectedLevel}
              onChange={(event) => {
                setSelectedLevel(event.target.value);
                setSelectedBatch("");
                setSelectedExamId("");
              }}
              className={fieldClass}
              disabled={!selectedFacultyId}
            >
              {levelOptions.map((levelOption) => (
                <option key={levelOption.value} value={levelOption.value}>
                  {levelOption.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Current batch</label>
            <input
              value={selectedBatch ? `Batch ${selectedBatch}` : "Auto selected"}
              className={`${fieldClass} bg-gray-50 text-gray-600`}
              readOnly
            />
          </div>

          <div>
            <label className={labelClass}>Terminal exam</label>
            <select
              value={selectedExamId}
              onChange={(event) => setSelectedExamId(event.target.value)}
              className={fieldClass}
              disabled={!exams.length}
            >
              <option value="">Choose exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Students</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {summary?.students ?? rows.length}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Subjects</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {summary?.subjects ?? subjects.length}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Average GPA</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatGpa(summary?.averageGpa)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Completed results</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {summary?.complete ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] p-4 text-sm text-[var(--color-primary-strong)]">
        GPA, rank, and cumulative GPA are calculated only after every subject in
        the selected exam has marks. Incomplete rows stay pending until teachers
        finish entering marks.
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-600">
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--color-primary)]" />
          Loading result ledger...
        </div>
      ) : selectedBatch && currentExam && subjects.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="ledger-scroll overflow-x-auto">
            <table className="min-w-245 border-separate border-spacing-0 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-20 min-w-60 bg-slate-50 px-4 py-3 font-semibold">
                  Student
                </th>
                {subjects.map((subject) => (
                  <th key={subject._id} className="min-w-37.5 px-4 py-3 font-semibold">
                    {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Term GPA</th>
                <th className="px-4 py-3 font-semibold">Cumulative</th>
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={subjects.length + 6}
                    className="border-t px-4 py-10 text-center text-gray-500"
                  >
                    No active students found for this batch.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.student._id}
                    className={`group ${
                      String(row.status).toLowerCase() === "absent"
                        ? "bg-yellow-50"
                        : row.failed
                          ? "bg-red-50"
                          : row.complete
                            ? "bg-white"
                            : "bg-amber-50/35"
                    } hover:bg-[var(--color-primary-bg)]/50`}
                  >
                    <td className="sticky left-0 z-10 min-w-60 border-t border-gray-100 bg-inherit px-4 py-3 text-gray-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{row.student.name}</p>
                          <p className="text-xs font-normal text-gray-500">
                            {row.student.studentId}
                          </p>
                        </div>
                        <Link
                          to={`/admin/student-performance/${row.student.studentId}?${viewQuery}`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)] hover:bg-[var(--color-primary-bg)]"
                          title="View student performance"
                          aria-label={`View performance for ${row.student.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                    {row.subjectResults.map((subjectResult) => (
                      <td
                        key={subjectResult.subjectId}
                        className={`border-t border-gray-100 px-4 py-3 ${subjectCellClass(subjectResult)}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">
                            {subjectResult.absent
                              ? "Absent"
                              : formatMark(subjectResult.obtainedMarks)}
                          </span>
                          {subjectResult.grade ? (
                            <span className="inline-flex rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {subjectResult.grade}
                            </span>
                          ) : subjectResult.obtainedMarks != null ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Failed
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-gray-400">
                              --
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="border-t border-gray-100 px-4 py-3 font-semibold">
                      {row.complete ? `${row.total}/${row.fullMarks}` : pendingText}
                    </td>
                    <td className="border-t border-gray-100 px-4 py-3">
                      {row.complete ? formatGpa(row.gpa) : pendingText}
                    </td>
                    <td className="border-t border-gray-100 px-4 py-3">
                      {row.complete || String(row.status).toLowerCase() === "absent"
                        ? formatGpa(row.cumulativeGpa)
                        : pendingText}
                    </td>
                    <td className="border-t border-gray-100 px-4 py-3">
                      {row.complete || String(row.status).toLowerCase() === "absent"
                        ? row.rank
                        : pendingText}
                    </td>
                    <td className="border-t border-gray-100 px-4 py-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          Select an active faculty, semester/year, batch, and exam to see the
          result ledger.
        </div>
      )}
    </div>
  );
}
