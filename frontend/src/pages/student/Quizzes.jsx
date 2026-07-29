import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Eye, RefreshCw } from "lucide-react";
import Button from "../../components/Button";
import {
  fetchStudentQuiz,
  fetchStudentQuizzes,
  saveStudentQuizProgress,
  submitStudentQuiz,
} from "../../services/apiQuiz";

const statusClass = {
  open: "border-green-100 bg-green-50 text-green-700",
  scheduled:
    "border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]",
  closed: "border-gray-200 bg-gray-50 text-gray-600",
  submitted: "border-green-100 bg-green-50 text-green-700",
};

const formatDateTime = (value) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
};

const formatRemaining = (milliseconds) => {
  const totalSeconds = Math.max(Math.floor(milliseconds / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const answersToPayload = (answers) =>
  Object.entries(answers)
    .filter(([, selectedOption]) => selectedOption)
    .map(([questionId, selectedOption]) => ({ questionId, selectedOption }));

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [remainingMs, setRemainingMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const saveTimerRef = useRef(null);
  const submittedRef = useRef(false);
  const answersRef = useRef({});

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const response = await fetchStudentQuizzes();
      setQuizzes(response?.data || []);
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
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (!activeQuiz?.availableUntil || activeQuiz.hasSubmitted)
      return undefined;

    const updateRemaining = () => {
      const nextRemaining =
        new Date(activeQuiz.availableUntil).getTime() - Date.now();
      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        submitQuiz({ automatic: true });
      }
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [activeQuiz]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const openQuiz = async (quizId) => {
    setLoading(true);
    setNotice({ type: "", message: "" });
    submittedRef.current = false;
    try {
      const response = await fetchStudentQuiz(quizId);
      const quiz = response?.data || null;
      setActiveQuiz(quiz);
      const nextAnswers = quiz?.savedAnswers || {};
      setAnswers(nextAnswers);
      answersRef.current = nextAnswers;
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Quiz is not open right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (nextAnswers) => {
    if (!activeQuiz || activeQuiz.hasSubmitted || !activeQuiz.isOpen) return;

    setSaving(true);
    try {
      const response = await saveStudentQuizProgress(
        activeQuiz.id,
        answersToPayload(nextAnswers),
      );
      if (response?.data?.status === "submitted") {
        setNotice({
          type: "success",
          message: `Time ended. Submitted score: ${response.data.obtainedMarks}/${response.data.fullMarks}`,
        });
        setActiveQuiz(null);
        setAnswers({});
        answersRef.current = {};
        await loadQuizzes();
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to save progress.",
      });
    } finally {
      setSaving(false);
    }
  };

  const queueSave = (nextAnswers) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveProgress(nextAnswers);
    }, 350);
  };

  const handleAnswer = (questionId, selectedOption) => {
    if (!activeQuiz?.isOpen || activeQuiz.hasSubmitted || remainingMs <= 0)
      return;

    const nextAnswers = { ...answers, [questionId]: selectedOption };
    setAnswers(nextAnswers);
    answersRef.current = nextAnswers;
    queueSave(nextAnswers);
  };

  const submitQuiz = async ({ automatic = false } = {}) => {
    if (!activeQuiz || submitting) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    setSubmitting(true);
    setNotice({ type: "", message: "" });
    try {
      const response = await submitStudentQuiz(
        activeQuiz.id,
        answersToPayload(answersRef.current),
      );
      setNotice({
        type: "success",
        message: `${automatic ? "Time is up. " : ""}Submitted. Score: ${response?.data?.obtainedMarks}/${response?.data?.fullMarks}`,
      });
      setActiveQuiz(null);
      setAnswers({});
      answersRef.current = {};
      await loadQuizzes();
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to submit quiz.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  );
  const isReviewMode = Boolean(activeQuiz?.hasSubmitted);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Online Quiz</h1>
          <p className="mt-1 text-gray-600">
            Take published subject quizzes during their scheduled time.
          </p>
        </div>
        <Button variant="secondary" onClick={loadQuizzes} disabled={loading}>
          <RefreshCw
            className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
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

      {!activeQuiz ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {quizzes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center lg:col-span-2">
              <Clock className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">
                No quiz is published for your class yet.
              </p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {quiz.subjectCode ? `${quiz.subjectCode} - ` : ""}
                      {quiz.subjectName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {quiz.title} - {quiz.marks} marks
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass[quiz.displayStatus] || statusClass.closed}`}
                  >
                    {quiz.displayStatus}
                  </span>
                </div>

                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  <p>Opens: {formatDateTime(quiz.availableFrom)}</p>
                  <p>Closes: {formatDateTime(quiz.availableUntil)}</p>
                </div>

                {quiz.hasSubmitted ? (
                  <div className="mt-4 space-y-3">
                    <p className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                      <CheckCircle2 className="mr-1 inline h-4 w-4" />
                      Submitted - Score {quiz.score}/{quiz.marks}
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => openQuiz(quiz.id)}
                      disabled={loading}
                    >
                      <Eye className="mr-2 inline h-4 w-4" />
                      View submission
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => openQuiz(quiz.id)}
                    disabled={!quiz.isOpen || loading}
                  >
                    {quiz.isOpen
                      ? quiz.inProgress
                        ? "Continue quiz"
                        : "Start quiz"
                      : quiz.displayStatus === "closed"
                        ? "Closed"
                        : "Not open yet"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeQuiz.subjectCode ? `${activeQuiz.subjectCode} - ` : ""}
                {activeQuiz.subjectName}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {answeredCount}/{activeQuiz.questions.length} answered
                {isReviewMode
                  ? ` - Score ${activeQuiz.score}/${activeQuiz.marks}`
                  : saving
                    ? " - saving..."
                    : " - progress autosaved"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!isReviewMode && (
                <span className="rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-2 font-mono text-lg font-bold text-[var(--color-primary-strong)]">
                  {formatRemaining(remainingMs)}
                </span>
              )}
              <Button variant="secondary" onClick={() => setActiveQuiz(null)}>
                Back to list
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {activeQuiz.questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <h3 className="font-bold text-gray-900">
                  {index + 1}. {question.questionText}
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {question.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleAnswer(question.id, option.label)}
                      disabled={remainingMs <= 0 || activeQuiz.hasSubmitted}
                      className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed ${
                        isReviewMode && option.label === question.correctOption
                          ? "border-green-300 bg-green-50 text-green-900"
                          : isReviewMode &&
                              answers[question.id] === option.label
                            ? "border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]"
                            : answers[question.id] === option.label
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]"
                              : "border-gray-200 bg-white text-gray-700 hover:border-[var(--color-primary-border)]"
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-bold">
                        {option.label}
                      </span>
                      <span className="flex-1">{option.text}</span>
                      {isReviewMode &&
                        option.label === question.correctOption && (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                            Correct
                          </span>
                        )}
                      {isReviewMode &&
                        answers[question.id] === option.label &&
                        option.label !== question.correctOption && (
                          <span className="rounded-full bg-[var(--color-primary-bg)] px-2 py-1 text-xs font-bold text-[var(--color-primary-strong)]">
                            Your answer
                          </span>
                        )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {isReviewMode ? (
            <p className="mt-6 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              This quiz has been submitted and is now read-only.
            </p>
          ) : (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                You can submit anytime. If time ends, saved answers are
                submitted automatically.
              </p>
              <Button
                onClick={() => submitQuiz()}
                disabled={submitting || remainingMs <= 0}
              >
                {submitting ? "Submitting" : "Submit quiz"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
