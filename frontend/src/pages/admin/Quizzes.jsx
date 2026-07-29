import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Eye, RefreshCw, X } from "lucide-react";
import Button from "../../components/Button";
import { fetchFaculties } from "../../services/apiFaculty";
import { fetchAdminQuizzes, publishAdminQuiz } from "../../services/apiQuiz";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-bg)]";
const labelClass = "mb-1 block text-xs font-semibold text-gray-600";

const splitSchedule = (from = "", until = "") => ({
  date: from ? from.slice(0, 10) : "",
  startTime: from ? from.slice(11, 16) : "",
  endTime: until ? until.slice(11, 16) : "",
});

const isSameDate = (value, date) => {
  if (!value || !date) return false;
  return new Date(value).toISOString().slice(0, 10) === date;
};

const statusClass = (status) => {
  if (status === "closed") return "bg-gray-100 text-gray-700 ring-gray-200";
  if (status === "published") return "bg-green-50 text-green-700 ring-green-100";
  return "bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)] ring-[var(--color-primary-bg)]";
};

export default function Quizzes() {
  const [faculties, setFaculties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filters, setFilters] = useState({
    facultyId: "",
    level: "",
  });
  const [recentFilter, setRecentFilter] = useState({
    date: "",
  });
  const [scheduleByQuiz, setScheduleByQuiz] = useState({});
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });

  const loadPage = async () => {
    setLoading(true);
    try {
      const [facultyResponse, quizResponse] = await Promise.all([
        fetchFaculties(),
        fetchAdminQuizzes(),
      ]);
      setFaculties(facultyResponse?.data || []);
      setGroups(quizResponse?.data || []);
      setNotice({ type: "", message: "" });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to load quizzes.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    const next = {};
    groups.forEach((group) => {
      group.quizzes.forEach((quiz) => {
        next[quiz.id] = splitSchedule(quiz.availableFrom, quiz.availableUntil);
      });
    });
    setScheduleByQuiz(next);
  }, [groups]);

  const selectedFaculty = faculties.find(
    (faculty) => String(faculty._id) === String(filters.facultyId),
  );
  const showRecentReceived = !filters.facultyId && !filters.level;

  const levelOptions = selectedFaculty?.levels || [];

  const latestBatchByClass = useMemo(() => {
    const latest = new Map();
    groups.forEach((group) => {
      const key = `${group.facultyId}-${group.level}`;
      const current = latest.get(key);
      if (!current || Number(group.batch) > Number(current.batch)) {
        latest.set(key, group);
      }
    });
    return latest;
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups
      .map((group) => {
        if (filters.facultyId && group.facultyId !== filters.facultyId) return null;
        if (filters.level && group.level !== filters.level) return null;
        const latestGroup = latestBatchByClass.get(`${group.facultyId}-${group.level}`);
        if (latestGroup?.batch !== group.batch) return null;

        const quizzes = group.quizzes;
        if (!quizzes.length) return null;

        return {
          ...group,
          quizzes,
          totalMarks: quizzes.reduce((sum, quiz) => sum + quiz.marks, 0),
        };
      })
      .filter(Boolean);
  }, [groups, filters.facultyId, filters.level, latestBatchByClass]);

  const allRecentQuizzes = useMemo(() => {
    return groups
      .flatMap((group) =>
        group.quizzes.map((quiz) => ({
          ...quiz,
          groupLabel: `${group.facultyCode} - Level ${group.level} - Batch ${group.batch}`,
        })),
      )
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [groups]);

  const recentQuizzes = useMemo(() => {
    return allRecentQuizzes
      .filter((quiz) =>
        recentFilter.date ? isSameDate(quiz.submittedAt, recentFilter.date) : true,
      )
      .slice(0, 6);
  }, [allRecentQuizzes, recentFilter.date]);

  const totals = useMemo(() => {
    const quizCount = filteredGroups.reduce(
      (sum, group) => sum + group.quizzes.length,
      0,
    );
    const marks = filteredGroups.reduce((sum, group) => sum + group.totalMarks, 0);
    return { quizCount, marks };
  }, [filteredGroups]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === "facultyId" ? { level: "" } : {}),
    }));
  };

  const updateRecentFilter = (field, value) => {
    setRecentFilter((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateSchedule = (quizId, field, value) => {
    setScheduleByQuiz((current) => ({
      ...current,
      [quizId]: {
        ...(current[quizId] || {}),
        [field]: value,
      },
    }));
  };

  const publishQuiz = async (quizId) => {
    const schedule = scheduleByQuiz[quizId] || {};
    if (!schedule.date || !schedule.startTime || !schedule.endTime) {
      setNotice({ type: "error", message: "Please choose the quiz date and time." });
      return;
    }

    setPublishingId(quizId);
    setNotice({ type: "", message: "" });
    try {
      await publishAdminQuiz(quizId, {
        availableFrom: `${schedule.date}T${schedule.startTime}`,
        availableUntil: `${schedule.date}T${schedule.endTime}`,
      });
      setNotice({ type: "success", message: "Quiz schedule saved for students." });
      await loadPage();
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to save quiz schedule.",
      });
    } finally {
      setPublishingId("");
    }
  };

  const renderQuizRow = (quiz) => {
    const schedule = scheduleByQuiz[quiz.id] || {};
    const status = quiz.displayStatus || quiz.status;
    const isPublished = quiz.status === "published";

    return (
      <div key={quiz.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900">
              {quiz.subjectCode ? `${quiz.subjectCode} - ` : ""}
              {quiz.subjectName}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {quiz.teacherName || "Teacher"} - {quiz.marks} marks
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${statusClass(status)}`}
              >
                {status}
              </span>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                Sent {quiz.submittedAt ? new Date(quiz.submittedAt).toLocaleDateString() : "-"}
              </span>
            </div>
          </div>

          <div className="grid w-full gap-3 xl:max-w-3xl xl:grid-cols-[140px_120px_120px_auto_auto]">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={inputClass}
                value={schedule.date || ""}
                onChange={(event) => updateSchedule(quiz.id, "date", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>From</label>
              <input
                type="time"
                className={inputClass}
                value={schedule.startTime || ""}
                onChange={(event) =>
                  updateSchedule(quiz.id, "startTime", event.target.value)
                }
              />
            </div>
            <div>
              <label className={labelClass}>To</label>
              <input
                type="time"
                className={inputClass}
                value={schedule.endTime || ""}
                onChange={(event) =>
                  updateSchedule(quiz.id, "endTime", event.target.value)
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => setSelectedQuiz(quiz)}
                className="w-full whitespace-nowrap"
              >
                <Eye className="mr-2 inline h-4 w-4" />
                View
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => publishQuiz(quiz.id)}
                disabled={publishingId === quiz.id}
                className="w-full whitespace-nowrap"
              >
                {publishingId === quiz.id
                  ? "Saving"
                  : isPublished
                    ? "Update time"
                    : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Online Quizzes</h1>
          <p className="mt-1 text-gray-600">
            Filter by class, review submitted MCQs, and set one quiz date with a
            start and end time.
          </p>
        </div>
        <Button variant="secondary" onClick={loadPage} disabled={loading}>
          <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className={labelClass}>Faculty</label>
            <select
              className={inputClass}
              value={filters.facultyId}
              onChange={(event) => updateFilter("facultyId", event.target.value)}
            >
              <option value="">All faculties</option>
              {faculties.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>
                  {faculty.code} - {faculty.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Semester / Year</label>
            <select
              className={inputClass}
              value={filters.level}
              onChange={(event) => updateFilter("level", event.target.value)}
              disabled={!filters.facultyId}
            >
              <option value="">All levels</option>
              {levelOptions.map((level) => (
                <option key={level.value} value={String(level.value)}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Showing the latest available batch for each selected faculty and
          semester/year.
        </p>
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

      {showRecentReceived && allRecentQuizzes.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Recent received
              </h2>
              <p className="text-sm text-gray-500">Newest submissions first</p>
            </div>
            <div className="w-full sm:w-48">
              <div>
                <label className={labelClass}>Filter date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={recentFilter.date}
                  onChange={(event) =>
                    updateRecentFilter("date", event.target.value)
                  }
                />
              </div>
            </div>
          </div>
          {recentQuizzes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-600">
              No recent quiz was received on that date.
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {recentQuizzes.map((quiz) => (
                <button
                  key={`recent-${quiz.id}`}
                  type="button"
                  onClick={() => {
                    setFilters((current) => ({
                      ...current,
                      facultyId: quiz.facultyId,
                      level: quiz.level,
                    }));
                    setSelectedQuiz(quiz);
                  }}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-bg)]"
                >
                  <p className="font-bold text-gray-900">{quiz.subjectName}</p>
                  <p className="mt-1 text-sm text-gray-600">{quiz.groupLabel}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Sent {quiz.submittedAt ? new Date(quiz.submittedAt).toLocaleString() : "-"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {loading && !groups.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center text-gray-600">
          Loading submitted quizzes...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <CalendarClock className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-gray-600">
            No received quiz matches the selected faculty or semester/year.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm font-semibold text-gray-600">
            Total quizzes: {totals.quizCount}
          </p>
          {filteredGroups.map((group) => (
            <section
              key={group.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {group.facultyCode} - Level {group.level} - Batch {group.batch}
                  </h2>
                  <p className="text-sm text-gray-600">{group.facultyName}</p>
                </div>
                <p className="text-sm font-semibold text-[var(--color-primary-strong)]">
                  {group.quizzes.length} subjects - {group.totalMarks} marks
                </p>
              </div>

              <div className="mt-5 space-y-4">
                {group.quizzes.map((quiz) => renderQuizRow(quiz))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-8 w-full max-w-4xl rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedQuiz.subjectName}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedQuiz.teacherName || "Teacher"} - Correct answers visible to
                  admin only.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuiz(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {selectedQuiz.questions.map((question, index) => (
                <div
                  key={question.id || index}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <h3 className="font-bold text-gray-900">
                      {index + 1}. {question.questionText}
                    </h3>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100">
                      Answer {question.correctOption}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {question.options.map((option) => (
                      <div
                        key={option.label}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          option.label === question.correctOption
                            ? "border-green-200 bg-green-50 text-green-900"
                            : "border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        <span className="font-bold">{option.label}.</span>{" "}
                        {option.text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
