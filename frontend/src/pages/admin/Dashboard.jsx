import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Search,
  X,
  GraduationCap,
  RefreshCw,
  Users,
} from "lucide-react";
import { fetchAdminDashboard } from "../../services/apiDashboard";
import { fetchFaculties } from "../../services/apiFaculty";

const cardClass = "rounded-lg border border-gray-200 bg-white p-5 shadow-sm";
const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

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

const getLevelOptions = (faculty) => {
  if (!faculty) return [];
  if (Array.isArray(faculty.levels) && faculty.levels.length) return faculty.levels;
  const max = Math.max(Number(faculty.maxLevel) || 1, 1);
  return Array.from({ length: max }, (_, index) => ({
    value: index + 1,
    label: `${faculty.structureType === "year" ? "Year" : "Semester"} ${index + 1}`,
  }));
};

export default function Dashboard() {
  const [faculties, setFaculties] = useState([]);
  const [facultyId, setFacultyId] = useState("");
  const [level, setLevel] = useState("");
  const [batch, setBatch] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupSearch, setGroupSearch] = useState("");

  const selectedFaculty = faculties.find((faculty) => faculty._id === facultyId);
  const levelOptions = useMemo(() => getLevelOptions(selectedFaculty), [selectedFaculty]);
  const activeBatchOptions = useMemo(() => {
    if (!facultyId || !level) return [];
    const batches = new Set(
      (dashboard?.activeClasses || [])
        .filter(
          (item) =>
            item.faculty?.id === facultyId && String(item.level) === String(level),
        )
        .map((item) => String(item.batch)),
    );
    return [...batches].sort((a, b) => Number(b) - Number(a));
  }, [dashboard?.activeClasses, facultyId, level]);
  const atRiskCluster = dashboard?.clusters?.find((cluster) => cluster.label === "At Risk");
  const strongCluster = dashboard?.clusters?.find((cluster) => cluster.label === "Strong Performer");
  const visibleClasses = showAllClasses
    ? dashboard?.activeClasses || []
    : (dashboard?.activeClasses || []).slice(0, 4);
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
    if (!selectedFaculty) {
      setLevel("");
      return;
    }
    if (level && levelOptions.some((item) => String(item.value) === String(level))) return;
    setLevel("");
  }, [selectedFaculty, level, levelOptions]);

  useEffect(() => {
    if (!batch) return;
    if (!facultyId || !level) {
      setBatch("");
      return;
    }
    if (activeBatchOptions.length && !activeBatchOptions.includes(String(batch))) {
      setBatch("");
    }
  }, [activeBatchOptions, batch, facultyId, level]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchAdminDashboard({ facultyId, level, batch });
        setDashboard(response?.data || null);
        setShowAllClasses(false);
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
  }, [facultyId, level, batch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Current students grouped by attendance, marks, quizzes, and exam activity.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-strong)]">
          <BrainCircuit className="h-4 w-4" />
          Student grouping
        </div>
      </div>

      <section className={cardClass}>
        <div className="grid gap-3 md:grid-cols-4">
          <select className={fieldClass} value={facultyId} onChange={(event) => setFacultyId(event.target.value)}>
            <option value="">All</option>
            {faculties.map((faculty) => (
              <option key={faculty._id} value={faculty._id}>
                {faculty.faculty_code || faculty.code} - {faculty.faculty_name || faculty.name}
              </option>
            ))}
          </select>
          <select className={fieldClass} value={level} onChange={(event) => setLevel(event.target.value)} disabled={!facultyId}>
            <option value="">All semesters/years</option>
            {levelOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value=""
            onChange={() => {}}
            disabled
          >
            <option value="">
              {facultyId && level && activeBatchOptions[0]
                ? `Current batch ${activeBatchOptions[0]}`
                : "Current batch"}
            </option>
          </select>
          <button
            type="button"
            onClick={() => {
              setFacultyId("");
              setLevel("");
              setBatch("");
            }}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Clear filters
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className={cardClass}>
          <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[var(--color-primary)]" />
          <p className="text-center text-gray-600">Loading dashboard analytics...</p>
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
              <p className="mt-1 text-3xl font-bold text-gray-900">{atRiskCluster?.count || 0}</p>
            </div>
            <div className={cardClass}>
              <GraduationCap className="mb-3 h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-500">Strong performers</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{strongCluster?.count || 0}</p>
            </div>
            <div className={cardClass}>
              <BarChart3 className="mb-3 h-5 w-5 text-[var(--color-primary)]" />
              <p className="text-sm text-gray-500">Current classes</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{dashboard?.activeClasses?.length || 0}</p>
            </div>
          </div>

          {!!dashboard?.activeClasses?.length && (
            <section className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Current Classes</h2>
                  <p className="text-sm text-gray-500">
                    Active classes included in this dashboard.
                  </p>
                </div>
                {dashboard.activeClasses.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllClasses((current) => !current)}
                    className="rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-strong)] hover:bg-[var(--color-primary-bg)]"
                  >
                    {showAllClasses
                      ? "View less"
                      : `See more (${dashboard.activeClasses.length - 4})`}
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {visibleClasses.map((item) => (
                  <div
                    key={`${item.faculty.id}-${item.level}-${item.batch}`}
                    className="rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <p className="font-bold text-gray-900">
                      {item.faculty.code} · Semester {item.level}
                    </p>
                    <p className="text-sm text-gray-500">
                      Batch {item.batch} · {item.studentCount} students
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
                    <p className="text-gray-500">Exam avg</p>
                    <p className="font-bold text-gray-900">{metric(cluster.averageFeatures.averageExamPercent)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">Attendance</p>
                    <p className="font-bold text-gray-900">{metric(cluster.averageFeatures.classAttendancePercent)}</p>
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

          <section className={cardClass}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Students Needing Review</h2>
                <p className="text-sm text-gray-500">Students who need attention appear first.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Class</th>
                    <th className="px-3 py-3">Cluster</th>
                    <th className="px-3 py-3">Exam avg</th>
                    <th className="px-3 py-3">Quiz</th>
                    <th className="px-3 py-3">Attendance</th>
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
                      <td className="px-3 py-3">{metric(student.features.averageExamPercent)}</td>
                      <td className="px-3 py-3">{metric(student.features.quizPercent)}</td>
                      <td className="px-3 py-3">{metric(student.features.classAttendancePercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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
                  {selectedGroup.count} students in this group. Group averages use every student listed here.
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
                    <th className="px-3 py-3">Exam avg</th>
                    <th className="px-3 py-3">Quiz</th>
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
                      <td className="px-3 py-3">{metric(student.features.averageExamPercent)}</td>
                      <td className="px-3 py-3">{metric(student.features.quizPercent)}</td>
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
