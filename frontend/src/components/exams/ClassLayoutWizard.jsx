import { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../Button";
import ClassLayoutDiagram from "./ClassLayoutDiagram";
import { buildLayout } from "../../data/examDummyData";

const STEPS = [
  "Room number",
  "Sections",
  "Rows",
  "Seats per row",
  "Review",
];

const emptySection = () => ({ rows: 4, seatsPerRow: 2 });

const inputClass =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export default function ClassLayoutWizard({ onSave, onCancel, initialLayout = null }) {
  const [step, setStep] = useState(0);
  const [roomNumber, setRoomNumber] = useState(initialLayout?.roomNumber ?? "");
  const [sectionCount, setSectionCount] = useState(initialLayout?.sections?.length || 2);
  const [sections, setSections] = useState(() => {
    if (initialLayout?.sections?.length) {
      return initialLayout.sections.map((sec) => ({
        rows: sec.rows.length,
        seatsPerRow: sec.rows[0]?.seats.length || 2,
      }));
    }
    return [emptySection(), emptySection()];
  });

  const previewLayout = useMemo(() => {
    if (step === 0 || !roomNumber) return null;
    if (step === 1) {
      const count = sectionCount || 1;
      return buildLayout(roomNumber, Array.from({ length: count }, () => emptySection()));
    }
    return buildLayout(roomNumber, sections.slice(0, sectionCount));
  }, [step, roomNumber, sectionCount, sections]);

  const setCount = (n) => {
    setSectionCount(n);
    const next = [];
    for (let i = 0; i < n; i++) next.push(sections[i] || emptySection());
    setSections(next);
  };

  const updateSec = (i, field, val) => {
    const next = [...sections];
    next[i] = { ...next[i], [field]: Math.max(1, Math.min(field === "rows" ? 10 : 3, Number(val) || 1)) };
    setSections(next);
  };

  const canNext = () => {
    if (step === 0) return roomNumber.trim().length > 0;
    if (step === 1) return sectionCount >= 1;
    return true;
  };

  const handleSave = () => {
    const layout = buildLayout(roomNumber.trim(), sections.slice(0, sectionCount));
    if (initialLayout?.id) layout.id = initialLayout.id;
    onSave(layout);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {initialLayout ? "Edit class layout" : "Add class layout"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex gap-2 flex-wrap">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                i === step
                  ? "bg-[var(--color-primary)] text-white"
                  : i < step
                    ? "bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {step === 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Room number
                </label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101"
                  className={inputClass}
                />
              </div>
            )}

            {step === 1 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  How many sections (blocks)?
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`px-4 py-2 rounded-lg border-2 font-medium ${
                        sectionCount === n
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Rows in each section</p>
                {sections.slice(0, sectionCount).map((sec, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Section {i + 1}</span>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => updateSec(i, "rows", sec.rows - 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold">{sec.rows}</span>
                      <button
                        type="button"
                        onClick={() => updateSec(i, "rows", sec.rows + 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg"
                      >
                        +
                      </button>
                      <span className="text-sm text-gray-500">rows</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Seats per row (usually 2)</p>
                {sections.slice(0, sectionCount).map((sec, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3">
                    <span className="font-medium text-gray-800">Section {i + 1}</span>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateSec(i, "seatsPerRow", n)}
                          className={`px-4 py-1 rounded-lg border ${
                            sec.seatsPerRow === n
                              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                              : "border-gray-300"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p>
                  <b>Room:</b> {roomNumber}
                </p>
                <p>
                  <b>Sections:</b> {sectionCount}
                </p>
                <p>
                  <b>Total seats:</b>{" "}
                  {sections.slice(0, sectionCount).reduce((a, s) => a + s.rows * s.seatsPerRow, 0)}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Preview</p>
            {previewLayout ? (
              <ClassLayoutDiagram layout={previewLayout} />
            ) : (
              <p className="text-sm text-gray-400">Enter room number to preview</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex justify-between">
          <Button
            variant="secondary"
            onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSave}>Save layout</Button>
          )}
        </div>
      </div>
    </div>
  );
}
