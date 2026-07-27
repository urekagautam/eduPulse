import { useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import Button from "../Button";
import ClassLayoutDiagram from "./ClassLayoutDiagram";
import {
  FACULTY_CATALOG,
  getLevelOptionsForFacultyCode,
  getFacultyByCode,
  getLevelLabel,
} from "../../data/examDummyData";
import { generateSeatPlan, assignmentsForRoom } from "../../utils/seatPlanGenerator";

const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

export default function SeatingArrangementTab({
  layouts,
  seatPlans,
  onSaveSeatPlans,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [activePlanId, setActivePlanId] = useState(seatPlans[0]?.id ?? null);

  const [form, setForm] = useState({
    title: "",
    roomIds: [],
    groups: [{ id: "g-1", facultyCode: "BCA", levels: ["1"] }],
    mode: "adjacent",
  });

  const activePlan = seatPlans.find((p) => p.id === activePlanId) ?? null;

  const toggle = (list, value) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const updateGroup = (id, patch) =>
    setForm((f) => ({
      ...f,
      groups: f.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));

  const addGroup = () =>
    setForm((f) => ({
      ...f,
      groups: [
        ...f.groups,
        { id: `g-${Date.now()}`, facultyCode: "BCA", levels: ["1"] },
      ],
    }));

  const removeGroup = (id) =>
    setForm((f) => ({
      ...f,
      groups: f.groups.length === 1 ? f.groups : f.groups.filter((g) => g.id !== id),
    }));

  const createPlan = () => {
    if (!form.title.trim()) return;
    if (form.roomIds.length === 0) return;
    if (!form.groups.some((g) => g.levels?.length)) return;

    const plan = generateSeatPlan({
      layouts,
      roomIds: form.roomIds,
      groups: form.groups.map((g) => ({
        facultyCode: g.facultyCode,
        levels: g.levels,
      })),
      mode: form.mode,
      examId: `seat-${Date.now()}`,
    });

    plan.title = form.title.trim();

    onSaveSeatPlans([plan, ...seatPlans]);
    setActivePlanId(plan.id);
    setShowCreate(false);
  };

  const groupLabel = (g) => {
    const fac = getFacultyByCode(g.facultyCode);
    if (!fac) return "Unknown";
    const parts = (g.levels || []).map((lvl) => getLevelLabel(fac.structureType, Number(lvl)));
    return `${fac.code}: ${parts.join(", ")}`;
  };

  const previewPlan = useMemo(() => {
    if (!showCreate) return null;
    if (form.roomIds.length === 0) return null;
    if (!form.groups.some((g) => g.levels?.length)) return null;
    if (!layouts.length) return null;
    return generateSeatPlan({
      layouts,
      roomIds: form.roomIds,
      groups: form.groups.map((g) => ({ facultyCode: g.facultyCode, levels: g.levels })),
      mode: form.mode,
      examId: "preview",
    });
  }, [showCreate, form, layouts]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seating Arrangement</h1>
          <p className="text-gray-600 mt-1">
            One seat plan for the exams happening together (any title / any faculty)
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Seating Plan</Button>
      </div>

      {seatPlans.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">History</h2>
            <p className="text-sm text-gray-500">Generated seating plans</p>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {seatPlans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePlanId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  activePlanId === p.id
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p.title || "Seat plan"} ({p.mode})
              </button>
            ))}
          </div>
        </div>
      )}

      {activePlan && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{activePlan.title || "Seat plan"}</h2>
              <p className="text-sm text-gray-600">
                Placed {activePlan.stats.studentsPlaced} students · Seats {activePlan.stats.seatsAvailable}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Groups: {(activePlan.groups || []).map(groupLabel).join(" | ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const regen = generateSeatPlan({
                    layouts,
                    roomIds: activePlan.roomIds,
                    groups: activePlan.groups,
                    mode: "adjacent",
                    examId: `seat-${Date.now()}`,
                  });
                  regen.title = activePlan.title;
                  onSaveSeatPlans([regen, ...seatPlans]);
                  setActivePlanId(regen.id);
                }}
              >
                Randomize (adjacent)
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const regen = generateSeatPlan({
                    layouts,
                    roomIds: activePlan.roomIds,
                    groups: activePlan.groups,
                    mode: "random",
                    examId: `seat-${Date.now()}`,
                  });
                  regen.title = activePlan.title;
                  onSaveSeatPlans([regen, ...seatPlans]);
                  setActivePlanId(regen.id);
                }}
              >
                Randomize (random)
              </Button>
            </div>
          </div>

          {activePlan.roomIds.map((rid) => {
            const layout = layouts.find((l) => l.id === rid);
            if (!layout) return null;
            return (
              <div key={rid} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-bold text-gray-800 mb-3">Room {layout.roomNumber}</h3>
                <ClassLayoutDiagram
                  layout={layout}
                  assignments={assignmentsForRoom(activePlan, layout)}
                />
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 min-h-screen">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900">Create seating plan</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 grid lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Exam title (e.g. First Terminal, Pre-Boards)</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="Enter exam title"
                  />
                </div>

                <div>
                  <p className={labelClass}>Rooms</p>
                  {layouts.length === 0 ? (
                    <p className="text-sm text-red-500">Add class layouts first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {layouts.map((l) => (
                        <label key={l.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.roomIds.includes(l.id)}
                            onChange={() =>
                              setForm((f) => ({ ...f, roomIds: toggle(f.roomIds, l.id) }))
                            }
                            className="w-4 h-4"
                          />
                          Room {l.roomNumber}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>Groups (faculty + semester/year)</p>
                    <button
                      type="button"
                      onClick={addGroup}
                      className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add group
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.groups.map((g) => {
                      const fac = getFacultyByCode(g.facultyCode);
                      const levelOptions = getLevelOptionsForFacultyCode(g.facultyCode);
                      return (
                        <div key={g.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Faculty
                              </label>
                              <select
                                value={g.facultyCode}
                                onChange={(e) =>
                                  updateGroup(g.id, {
                                    facultyCode: e.target.value,
                                    levels: ["1"],
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                              >
                                {FACULTY_CATALOG.map((f) => (
                                  <option key={f.id} value={f.code}>
                                    {f.code} ({f.structureType})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeGroup(g.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Remove group"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-2">
                              {fac?.structureType === "year" ? "Years" : "Semesters"}
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {levelOptions.map((o) => (
                                <label key={o.value} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={(g.levels || []).includes(o.value)}
                                    onChange={() =>
                                      updateGroup(g.id, {
                                        levels: toggle(g.levels || [], o.value),
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                  {o.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className={labelClass}>Mode</p>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="mode"
                        checked={form.mode === "adjacent"}
                        onChange={() => setForm((f) => ({ ...f, mode: "adjacent" }))}
                        className="w-4 h-4"
                      />
                      Adjacent roll numbers
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="mode"
                        checked={form.mode === "random"}
                        onChange={() => setForm((f) => ({ ...f, mode: "random" }))}
                        className="w-4 h-4"
                      />
                      Random roll numbers
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createPlan}>Generate</Button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Preview</p>
                {!previewPlan ? (
                  <p className="text-sm text-gray-500">
                    Select rooms and groups to preview.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Students placed: <b>{previewPlan.stats.studentsPlaced}</b> · Seats:{" "}
                      <b>{previewPlan.stats.seatsAvailable}</b>
                    </p>
                    {previewPlan.roomIds.slice(0, 1).map((rid) => {
                      const layout = layouts.find((l) => l.id === rid);
                      if (!layout) return null;
                      return (
                        <div key={rid}>
                          <p className="text-sm font-semibold text-gray-800 mb-2">
                            Room {layout.roomNumber}
                          </p>
                          <ClassLayoutDiagram
                            layout={layout}
                            assignments={assignmentsForRoom(previewPlan, layout)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

