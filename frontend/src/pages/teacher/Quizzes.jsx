import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Send, Save } from "lucide-react";
import Button from "../../components/Button";
import {
  fetchTeacherQuizClass,
  fetchTeacherQuizContext,
  saveTeacherQuizDraft,
  sendTeacherQuizToAdmin,
} from "../../services/apiQuiz";

const optionLabels = ["A", "B", "C", "D"];
const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-bg)]";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const makeEmptyQuestions = () =>
  Array.from({ length: 10 }, () => ({
    questionText: "",
    options: optionLabels.map((label) => ({ label, text: "" })),
    correctOption: "",
  }));

export default function Quizzes() {
  const [assignments, setAssignments] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [assignment, setAssignment] = useState(null);
  const [title, setTitle] = useState("Online Quiz");
  const [questions, setQuestions] = useState(makeEmptyQuestions);
  const [status, setStatus] = useState("draft");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadContext = async () => {
      setLoading(true);
      try {
        const response = await fetchTeacherQuizContext();
        const nextAssignments = response?.data?.assignments || [];
        setAssignments(nextAssignments);
        setSelectedOfferingId(nextAssignments[0]?.classOfferingId || "");
      } catch (error) {
        setNotice({
          type: "error",
          message: error.message || "Failed to load assigned subjects.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadContext();
  }, []);

  useEffect(() => {
    const loadQuiz = async () => {
      if (!selectedOfferingId) return;
      setLoading(true);
      setNotice({ type: "", message: "" });
      try {
        const response = await fetchTeacherQuizClass(selectedOfferingId);
        const data = response?.data;
        setAssignment(data?.assignment || null);
        setTitle(data?.quiz?.title || "Online Quiz");
        setQuestions(data?.quiz?.questions || makeEmptyQuestions());
        setStatus(data?.quiz?.status || "draft");
      } catch (error) {
        setNotice({
          type: "error",
          message: error.message || "Failed to load quiz template.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [selectedOfferingId]);

  const selectedSummary = useMemo(() => {
    if (!assignment) return "";
    return `${assignment.facultyCode} - ${assignment.levelLabel} - ${assignment.subjectName} - Batch ${assignment.batch}`;
  }, [assignment]);

  const canEdit = status !== "published";

  const updateQuestion = (index, field, value) => {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [field]: value } : question,
      ),
    );
  };

  const updateOption = (questionIndex, label, value) => {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option) =>
            option.label === label ? { ...option, text: value } : option,
          ),
        };
      }),
    );
  };

  const saveQuiz = async (send = false) => {
    if (!selectedOfferingId || !canEdit) return;
    setSaving(true);
    setNotice({ type: "", message: "" });
    try {
      const payload = { title, questions };
      const response = send
        ? await sendTeacherQuizToAdmin(selectedOfferingId, payload)
        : await saveTeacherQuizDraft(selectedOfferingId, payload);
      setStatus(response?.data?.status || (send ? "submitted" : status));
      setNotice({
        type: "success",
        message: send ? "Quiz sent to admin." : "Draft saved.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to save quiz.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Online Quiz</h1>
        <p className="mt-1 text-gray-600">
          Prepare 10 MCQs for the subjects you are actively teaching right now.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {loading && !assignments.length ? (
          <p className="text-gray-600">Loading active assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-600">
            No active teaching assignment is available for quizzes.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div>
              <label className={labelClass}>Assigned subject</label>
              <select
                className={inputClass}
                value={selectedOfferingId}
                onChange={(event) => setSelectedOfferingId(event.target.value)}
              >
                {assignments.map((item) => (
                  <option
                    key={item.classOfferingId}
                    value={item.classOfferingId}
                  >
                    {item.facultyCode} - {item.levelLabel} - {item.subjectName}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] px-4 py-3">
              <p className="text-xs font-semibold uppercase text-[var(--color-primary-strong)]">
                Status
              </p>
              <p className="mt-1 text-sm font-bold capitalize text-[var(--color-primary-strong)]">
                {status.replace("_", " ")}
              </p>
            </div>
          </div>
        )}

        {selectedSummary && (
          <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {selectedSummary}
          </p>
        )}
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

      {selectedOfferingId && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full max-w-xl">
              <label className={labelClass}>Quiz title</label>
              <input
                className={inputClass}
                value={title}
                disabled={!canEdit}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => saveQuiz(false)}
                disabled={saving || !canEdit}
              >
                {saving ? (
                  <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 inline h-4 w-4" />
                )}
                Save draft
              </Button>
              <Button
                onClick={() => saveQuiz(true)}
                disabled={saving || !canEdit}
              >
                <Send className="mr-2 inline h-4 w-4" />
                Save and send
              </Button>
            </div>
          </div>

          {!canEdit && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              Admin has published this quiz, so the question paper is locked.
            </div>
          )}

          <div className="mt-6 space-y-5">
            {questions.map((question, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-gray-900">
                    Question {index + 1}
                  </h2>
                  {question.correctOption && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Answer {question.correctOption}
                    </span>
                  )}
                </div>
                <textarea
                  className={`${inputClass} mt-3 min-h-20 resize-y bg-white`}
                  value={question.questionText}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateQuestion(index, "questionText", event.target.value)
                  }
                  placeholder="Type the question"
                />

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {optionLabels.map((label) => (
                    <div key={label} className="flex gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-gray-700 ring-1 ring-gray-200">
                        {label}
                      </span>
                      <input
                        className={`${inputClass} bg-white`}
                        value={
                          question.options.find(
                            (option) => option.label === label,
                          )?.text || ""
                        }
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateOption(index, label, event.target.value)
                        }
                        placeholder={`Option ${label}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label className={labelClass}>Correct answer</label>
                  <div className="flex flex-wrap gap-2">
                    {optionLabels.map((label) => (
                      <button
                        key={label}
                        type="button"
                        disabled={!canEdit}
                        onClick={() =>
                          updateQuestion(index, "correctOption", label)
                        }
                        className={`h-10 w-12 rounded-lg text-sm font-bold ring-1 transition ${
                          question.correctOption === label
                            ? "bg-[var(--color-primary)] text-white ring-[var(--color-primary)]"
                            : "bg-white text-gray-700 ring-gray-200 hover:bg-[var(--color-primary-bg)]"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
