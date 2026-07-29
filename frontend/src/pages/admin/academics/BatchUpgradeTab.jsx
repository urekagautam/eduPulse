import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import Button from "../../../components/Button";
import { fetchStudents } from "../../../services/apiAddStudent";
import { batchUpgradeStudents } from "../../../services/apiBatchUpgrade";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const SEMESTER_NAMES = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
];
const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
  const name = names[level - 1] || `Level ${level}`;
  return structureType === "semester" ? `${name} Semester` : `${name} Year`;
}

function getLevelOptions(faculty) {
  if (!faculty) return [];
  const limit = faculty.structureType === "semester" ? 8 : 5;
  const max = Math.min(Math.max(Number(faculty.maxLevel) || 1, 1), limit);
  return Array.from({ length: max }, (_, i) => {
    const level = i + 1;
    return { value: level, label: getLevelLabel(faculty.structureType, level) };
  });
}

function Field({ label, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function BatchUpgradeTab({ faculties, onComplete }) {
  const [form, setForm] = useState({
    facultyId: "",
    fromLevel: "",
    batch: "",
  });
  const [levelStudents, setLevelStudents] = useState([]);
  const [higherLevelStudents, setHigherLevelStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  const selectedFaculty = faculties.find((faculty) => faculty._id === form.facultyId);
  const levelOptions = useMemo(() => getLevelOptions(selectedFaculty), [selectedFaculty]);
  const fromLevel = Number(form.fromLevel);
  const nextLevel = fromLevel + 1;
  const isFinalLevel =
    selectedFaculty && fromLevel >= Number(selectedFaculty.maxLevel || 0);

  const batches = useMemo(() => {
    const values = new Set();
    levelStudents.forEach((student) => {
      if (student.admission?.batch) values.add(String(student.admission.batch));
    });
    return Array.from(values).sort((a, b) => Number(b) - Number(a));
  }, [levelStudents]);

  const selectedCount = useMemo(
    () =>
      levelStudents.filter(
        (student) => String(student.admission?.batch) === String(form.batch),
      ).length,
    [form.batch, levelStudents],
  );
  const occupiedHigherLevelCount = useMemo(
    () =>
      higherLevelStudents.filter(
        (student) => String(student.admission?.batch) === String(form.batch),
      ).length,
    [form.batch, higherLevelStudents],
  );

  const loadStudentsForLevel = async ({ showErrors = true } = {}) => {
    if (!form.facultyId || !form.fromLevel) {
      setLevelStudents([]);
      setHigherLevelStudents([]);
      return;
    }

    setLoadingStudents(true);
    try {
      const sourceResponse = await fetchStudents({
        facultyId: form.facultyId,
        level: form.fromLevel,
      });
      setLevelStudents(
        Array.isArray(sourceResponse?.data) ? sourceResponse.data : [],
      );
      const sourceStudents = Array.isArray(sourceResponse?.data)
        ? sourceResponse.data
        : [];
      const sourceBatches = Array.from(
        new Set(sourceStudents.map((student) => String(student.admission?.batch))),
      ).sort((a, b) => Number(b) - Number(a));
      setForm((current) => {
        if (current.batch && sourceBatches.includes(String(current.batch))) {
          return current;
        }
        return { ...current, batch: sourceBatches[0] || "" };
      });

      if (selectedFaculty && Number(form.fromLevel) < Number(selectedFaculty.maxLevel)) {
        const higherResponse = await fetchStudents({
          facultyId: form.facultyId,
          level: Number(form.fromLevel) + 1,
        });
        setHigherLevelStudents(
          Array.isArray(higherResponse?.data) ? higherResponse.data : [],
        );
      } else {
        setHigherLevelStudents([]);
      }
    } catch (error) {
      setLevelStudents([]);
      setHigherLevelStudents([]);
      if (showErrors) {
        setNotice({
          type: "error",
          message: error.message || "Could not load students for this level.",
        });
      }
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadStudentsForLevel();
  }, [form.facultyId, form.fromLevel, selectedFaculty]);

  const updateForm = (changes) => {
    setNotice({ type: "", message: "" });
    setForm((current) => ({ ...current, ...changes }));
  };

  const handleSubmit = async () => {
    if (!selectedFaculty) {
      setNotice({ type: "error", message: "Please select a faculty." });
      return;
    }

    if (!form.fromLevel || !form.batch) {
      setNotice({
        type: "error",
        message: "Please select the current level and batch.",
      });
      return;
    }

    if (selectedCount === 0) {
      setNotice({
        type: "error",
        message: "No active students found for this selection.",
      });
      return;
    }

    if (!isFinalLevel && occupiedHigherLevelCount > 0) {
      setNotice({
        type: "error",
        message: `${getLevelLabel(
          selectedFaculty.structureType,
          nextLevel,
        )} already has active students. This higher semester/year should be upgraded first.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await batchUpgradeStudents({
        facultyId: form.facultyId,
        batch: form.batch,
        fromLevel: form.fromLevel,
        toLevel: isFinalLevel ? null : nextLevel,
        markAsGraduated: Boolean(isFinalLevel),
      });

      const updatedCount = response?.data?.updatedCount ?? selectedCount;
      setNotice({
        type: "success",
        message: isFinalLevel
          ? `${updatedCount} student(s) marked as graduated in the database.`
          : `${updatedCount} student(s) upgraded to ${getLevelLabel(
              selectedFaculty.structureType,
              nextLevel,
            )}.`,
      });
      onComplete?.();
      await loadStudentsForLevel({ showErrors: false });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Batch upgrade failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">
        Semester / Year Batch Upgrade
      </h2>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
        Upgrade a selected faculty batch to the next semester or year. After the
        final level, mark the batch as graduated in the database.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Faculty">
          <select
            className={selectClass}
            value={form.facultyId}
            onChange={(e) =>
              updateForm({
                facultyId: e.target.value,
                fromLevel: "",
                batch: "",
              })
            }
          >
            <option value="">Select faculty</option>
            {faculties.map((faculty) => (
              <option key={faculty._id} value={faculty._id}>
                {faculty.code} ({faculty.structureType})
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={
            selectedFaculty?.structureType === "year"
              ? "From year"
              : "From semester"
          }
        >
          <select
            className={selectClass}
            value={form.fromLevel}
            onChange={(e) =>
              updateForm({
                fromLevel: e.target.value,
                batch: "",
              })
            }
            disabled={!form.facultyId}
          >
            <option value="">Select level</option>
            {levelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Batch">
          <select
            className={selectClass}
            value={form.batch}
            onChange={(e) => updateForm({ batch: e.target.value })}
            disabled={!form.fromLevel || loadingStudents}
          >
            <option value="">
              {loadingStudents ? "Loading batches..." : "Select batch"}
            </option>
            {batches.map((batch) => (
              <option key={batch} value={batch}>
                Batch {batch}
              </option>
            ))}
          </select>
        </Field>

        {form.batch && (
          <div className="flex items-end">
            <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 w-full">
              {selectedCount} active student(s) selected
              {!isFinalLevel
                ? ` - Moves to ${getLevelLabel(selectedFaculty.structureType, nextLevel)}`
                : isFinalLevel
                  ? " - Will be marked as graduated"
                : ""}
            </p>
          </div>
        )}
      </div>

      {form.batch && !isFinalLevel && occupiedHigherLevelCount > 0 && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {getLevelLabel(selectedFaculty.structureType, nextLevel)} already has{" "}
          {occupiedHigherLevelCount} active student(s). This higher
          semester/year should be upgraded first.
        </p>
      )}

      {selectedFaculty && isFinalLevel && (
        <label className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm font-medium text-green-800">
          <input type="checkbox" checked readOnly className="w-4 h-4" />
          Mark selected batch as graduated
        </label>
      )}

      {notice.message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.type === "success"
              ? "bg-green-50 text-green-800 border border-green-100"
              : "bg-red-50 text-red-800 border border-red-100"
          }`}
        >
          {notice.message}
        </p>
      )}

      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={submitting || loadingStudents}
      >
        {submitting ? (
          <>
            <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
            Applying upgrade
          </>
        ) : (
          "Apply batch upgrade"
        )}
      </Button>
    </div>
  );
}
