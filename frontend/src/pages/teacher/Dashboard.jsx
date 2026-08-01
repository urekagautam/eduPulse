import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  GraduationCap,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { fetchTeacherDashboard } from "../../services/apiDashboard";

const cardClass = "rounded-lg border border-gray-200 bg-white p-5 shadow-sm";

const colorClass = {
  red: "border-red-100 bg-red-50 text-red-700",
  yellow: "border-yellow-100 bg-yellow-50 text-yellow-800",
  blue: "border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]",
  green: "border-green-100 bg-green-50 text-green-700",
  gray: "border-gray-100 bg-gray-50 text-gray-700",
};

const dotClass = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  blue: "bg-[var(--color-primary-bg)]0",
  green: "bg-green-500",
  gray: "bg-gray-500",
};

const metric = (value) => (value == null ? "--" : `${Number(value).toFixed(1)}%`);

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupSearch, setGroupSearch] = useState("");

  const classOptions = dashboard?.teacherGroups || [];
  const selectedClass =
    classOptions.find(
      (group) => `${group.faculty.id}-${group.level}-${group.batch}` === selectedClassKey,
    ) || classOptions[0] || null;
  const visibleGroupStudents = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    const students = selectedGroup?.students || [];
    if (!query) return students;
    return students.filter((student) =>
      [
        student.name,
        student.studentCode,
        student.faculty?.code,
        `semester ${student.level}`,
        `sem ${student.level}`,
        `batch ${student.batch}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [groupSearch, selectedGroup]);

  const atRiskCount =
    dashboard?.clusters?.find((cluster) => cluster.label === "At Risk")?.count || 0;
  const averageCount =
    dashboard?.clusters?.find((cluster) => cluster.label === "Average")?.count || 0;

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const [facultyId, level, batch] = selectedClassKey.split("-");
        const response = await fetchTeacherDashboard({
          facultyId,
          level,
          batch,
        });
        setDashboard(response?.data || null);
        setSelectedGroup(null);
        setGroupSearch("");
      } catch (err) {
        setDashboard(null);
        setError(err.message || "Failed to load dashboard analytics.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [selectedClassKey]);

  useEffect(() => {
    if (!dashboard?.teacherGroups?.length || selectedClassKey) return;
    const firstGroup = dashboard.teacherGroups[0];
    setSelectedClassKey(`${firstGroup.faculty.id}-${firstGroup.level}-${firstGroup.batch}`);
  }, [dashboard?.teacherGroups, selectedClassKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Final-score predictions and KNN student categories for your assigned classes.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-strong)]">
          <GraduationCap className="h-4 w-4" />
          EduPulse
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {!!classOptions.length && (
        <section className={cardClass}>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Current class
          </label>
          <select
            value={selectedClassKey}
            onChange={(event) => setSelectedClassKey(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] md:max-w-xl"
          >
            {classOptions.map((group) => (
              <option
                key={`${group.faculty.id}-${group.level}-${group.batch}`}
                value={`${group.faculty.id}-${group.level}-${group.batch}`}
              >
                {group.faculty.code} - Semester {group.level} - Batch {group.batch}
              </option>
            ))}
          </select>
          {selectedClass && (
            <p className="mt-2 text-sm text-gray-500">
              Subjects: {selectedClass.subjects.map((subject) => subject.code || subject.name).join(", ")}
            </p>
          )}
        </section>
      )}

      {loading ? (
        <div className={cardClass}>
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--color-primary)]" />
          <p className="text-center text-gray-600">Loading class analytics...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className={cardClass}>
              <Users className="mb-3 h-5 w-5 text-[var(--color-primary)]" />
              <p className="text-sm text-gray-500">Students reviewed</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{dashboard?.trainedSampleCount || 0}</p>
            </div>
            <div className={cardClass}>
              <AlertTriangle className="mb-3 h-5 w-5 text-red-600" />
              <p className="text-sm text-gray-500">At risk</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{atRiskCount}</p>
            </div>
            <div className={cardClass}>
              <BookOpenCheck className="mb-3 h-5 w-5 text-yellow-600" />
              <p className="text-sm text-gray-500">Average</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{averageCount}</p>
            </div>
            <div className={cardClass}>
              <BarChart3 className="mb-3 h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-500">Assigned classes</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{dashboard?.teacherGroups?.length || 0}</p>
            </div>
          </div>

          {!!dashboard?.teacherGroups?.length && (
            <section className={cardClass}>
              <h2 className="text-xl font-bold text-gray-900">Your Classes</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.teacherGroups.map((group) => (
                  <div key={`${group.faculty.id}-${group.level}-${group.batch}`} className="rounded-lg border border-gray-200 p-4">
                    <p className="font-bold text-gray-900">
                      {group.faculty.code} · Semester {group.level}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">Batch {group.batch}</p>
                    <p className="mt-3 text-sm text-gray-600">
                      {group.subjects.map((subject) => subject.code || subject.name).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-4">
            {(dashboard?.clusters || []).map((cluster) => (
              <div key={cluster.clusterId} className={cardClass}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${colorClass[cluster.color] || colorClass.gray}`}>
                    {cluster.label}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{cluster.count}</span>
                </div>
                <p className="mt-3 min-h-10 text-sm text-gray-600">{cluster.description}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Averages are calculated from all {cluster.count} students in this group.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">Predicted final</p>
                    <p className="font-bold text-gray-900">{metric(cluster.averageFeatures.predictedFinalPercent)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">KNN confidence</p>
                    <p className="font-bold text-gray-900">{metric(cluster.averageFeatures.knnConfidencePercent)}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {cluster.students.slice(0, 4).map((student) => (
                    <div key={student.studentId} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <p className="truncate font-semibold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">
                        {student.faculty.code} · Semester {student.level} · Batch {student.batch}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroup(cluster);
                    setGroupSearch("");
                  }}
                  className="mt-4 w-full rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-strong)] hover:bg-[var(--color-primary-bg)]"
                >
                  View all students
                </button>
              </div>
            ))}
          </section>

          {false && (
          <section className={cardClass}>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">Prediction Review</h2>
              <p className="text-sm text-gray-500">
                Students are ordered from At Risk to Excellent by their KNN category.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Class</th>
                    <th className="px-3 py-3">KNN category</th>
                    <th className="px-3 py-3">Predicted final</th>
                    <th className="px-3 py-3">Class att.</th>
                    <th className="px-3 py-3">Exam att.</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard?.students || []).slice(0, 12).map((student) => (
                    <tr key={student.studentId} className="border-t border-gray-100">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.studentCode}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {student.faculty.code} · Sem {student.level} · Batch {student.batch}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2 font-semibold text-gray-700">
                          <span className={`h-2.5 w-2.5 rounded-full ${dotClass[student.cluster?.color] || dotClass.gray}`} />
                          {student.cluster?.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">{metric(student.prediction?.predictedFinalPercent)}</td>
                      <td className="px-3 py-3">{metric(student.features.classAttendancePercent)}</td>
                      <td className="px-3 py-3">{metric(student.features.examAttendancePercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          )}
        </>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[86vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedGroup.label} Students
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedGroup.count} students in this group for the selected class.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close group list"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-gray-100 px-5 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Search by student name, ID, semester, or batch"
                />
              </div>
            </div>

            <div className="overflow-auto px-5 py-4">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Class</th>
                    <th className="px-3 py-3">Predicted final</th>
                    <th className="px-3 py-3">Class att.</th>
                    <th className="px-3 py-3">Exam att.</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGroupStudents.map((student) => (
                    <tr key={student.studentId} className="border-t border-gray-100">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.studentCode}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {student.faculty.code} · Semester {student.level} · Batch {student.batch}
                      </td>
                      <td className="px-3 py-3">{metric(student.prediction?.predictedFinalPercent)}</td>
                      <td className="px-3 py-3">{metric(student.features.classAttendancePercent)}</td>
                      <td className="px-3 py-3">{metric(student.features.examAttendancePercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleGroupStudents.length && (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No students match your search.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
