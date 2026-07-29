import ExamScheduleTab from "../../components/exams/ExamScheduleTab";
// import SeatingArrangementTab from "../../components/exams/SeatingArrangementTab";
// import ClassLayoutsTab from "../../components/exams/ClassLayoutsTab";

const TABS = [
  { id: "schedule", label: "Exam Schedule" },
  // { id: "seating", label: "Seating Arrangement" },
  // { id: "layouts", label: "Class Layouts" },
];

export default function Exams() {
  return (
    <div className="max-w-6xl">
      <div className="flex gap-1 p-1 bg-gray-200/80 rounded-xl w-fit mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all bg-white text-[var(--color-primary)] shadow-sm"
          >
            {t.label}
          </button>
        ))}
      </div>

      <ExamScheduleTab />
    </div>
  );
}
