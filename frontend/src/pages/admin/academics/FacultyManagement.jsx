import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/Button.jsx";
import { fetchFaculties, updateFaculty, deleteFaculty } from "../../../services/apiFaculty";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const MAX_SEMESTERS = 8;
const MAX_YEARS = 5;

function getLevelOptions(faculty) {
  if (!faculty) return [];
  const limit = faculty.structureType === "semester" ? MAX_SEMESTERS : MAX_YEARS;
  return Array.from({ length: limit }, (_, i) => i + 1);
}

export default function FacultyManagement() {
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [facultyEditForm, setFacultyEditForm] = useState({
    code: "",
    name: "",
    structureType: "semester",
    maxLevel: 8,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [facultyToDelete, setFacultyToDelete] = useState(null);

  const loadFaculties = async () => {
    setLoading(true);
    try {
      const response = await fetchFaculties();
      if (response?.success && Array.isArray(response.data)) {
        // Normalize id fields: prefer `_id`, fall back to `id`
        setFaculties(
          response.data.map((f) => ({ ...f, _id: f._id ?? f.id })),
        );
      }
    } catch (error) {
      console.error("Failed to load faculties:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculties();
  }, []);

  const startEditFaculty = (faculty) => {
    setEditingFacultyId(faculty._id);
    setFacultyEditForm({
      code: faculty.code,
      name: faculty.name,
      structureType: faculty.structureType,
      maxLevel: faculty.maxLevel,
    });
  };

  const cancelEditFaculty = () => {
    setEditingFacultyId(null);
    setFacultyEditForm({
      code: "",
      name: "",
      structureType: "semester",
      maxLevel: 8,
    });
  };

  const handleUpdateFaculty = async () => {
    if (!editingFacultyId) return;
    if (!facultyEditForm.name.trim() || !facultyEditForm.code.trim()) return;

    setSaving(true);
    try {
      const payload = {
        code: facultyEditForm.code.trim().toUpperCase(),
        name: facultyEditForm.name.trim(),
        structureType: facultyEditForm.structureType,
        maxLevel: Number(facultyEditForm.maxLevel),
      };
      const result = await updateFaculty(editingFacultyId, payload);
      if (result?.success && result.data) {
        const updated = { ...result.data, _id: result.data._id ?? result.data.id };
        setFaculties((current) =>
          current.map((f) => (f._id === editingFacultyId ? updated : f)),
        );
        cancelEditFaculty();
      }
    } catch (error) {
      console.error("Failed to update faculty:", error);
      alert(error?.message || "Failed to update faculty. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaculty = async (facultyId) => {
    setDeletingId(facultyId);
    try {
      const result = await deleteFaculty(facultyId);
      if (result?.success) {
        setFaculties((current) => current.filter((f) => f._id !== facultyId));
        if (editingFacultyId === facultyId) cancelEditFaculty();
      }
    } catch (error) {
      console.error("Failed to delete faculty:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteFaculty = async () => {
    if (!facultyToDelete) return;
    await handleDeleteFaculty(facultyToDelete._id);
    setFacultyToDelete(null);
  };

  const cancelDeleteFaculty = () => {
    setFacultyToDelete(null);
  };

  const editedFaculty = faculties.find((f) => f._id === editingFacultyId);
  const maxOptions = getLevelOptions(
    editingFacultyId ? facultyEditForm : editedFaculty || facultyEditForm,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Faculties</h1>
          <p className="text-gray-600 mt-1">
            Edit or delete faculty records from the dedicated faculty management page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/academics")}>Back to Academics</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_auto]">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">All Faculties</h2>
              <p className="text-sm text-gray-600">
                Select a faculty row to edit its code, name, structure, or total levels.
              </p>
            </div>
            <div className="text-sm text-gray-700">
              {loading
                ? "Loading faculties..."
                : `${faculties.length} faculty${faculties.length === 1 ? "" : "ies"}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Code</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Full Name</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Structure</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Total</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {faculties.map((faculty) => {
                  const isEditing = editingFacultyId === faculty._id;
                  return (
                      <tr key={faculty._id}>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              className={inputClass}
                              value={facultyEditForm.code}
                              onChange={(e) =>
                                setFacultyEditForm((prev) => ({
                                  ...prev,
                                  code: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            faculty.code
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              className={inputClass}
                              value={facultyEditForm.name}
                              onChange={(e) =>
                                setFacultyEditForm((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            faculty.name
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              className={selectClass}
                              value={facultyEditForm.structureType}
                              onChange={(e) =>
                                setFacultyEditForm((prev) => {
                                  const nextType = e.target.value;
                                  return {
                                    ...prev,
                                    structureType: nextType,
                                    maxLevel:
                                      nextType === "semester"
                                        ? MAX_SEMESTERS
                                        : Math.min(prev.maxLevel, MAX_YEARS),
                                  };
                                })
                              }
                            >
                              <option value="semester">Semester based</option>
                              <option value="year">Year based</option>
                            </select>
                          ) : (
                            faculty.structureType === "semester"
                              ? "Semester based"
                              : "Year based"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              className={selectClass}
                              value={facultyEditForm.maxLevel}
                              onChange={(e) =>
                                setFacultyEditForm((prev) => ({
                                  ...prev,
                                  maxLevel: Number(e.target.value),
                                }))
                              }
                            >
                              {maxOptions.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          ) : (
                            `${faculty.maxLevel} ${faculty.structureType === "semester" ? "sem" : "yr"}`
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                type="button"
                                onClick={handleUpdateFaculty}
                                disabled={saving}
                              >
                                {saving ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={cancelEditFaculty}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => startEditFaculty(faculty)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                type="button"
                                onClick={() => setFacultyToDelete(faculty)}
                                disabled={deletingId === faculty._id}
                              >
                                {deletingId === faculty._id ? "Deleting..." : "Delete"}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                  );
                })}
              </tbody>
            </table>
            {faculties.length === 0 && !loading && (
              <div className="p-6 text-sm text-gray-500">No faculties available.</div>
            )}
          </div>
        </div>
      </div>

      {facultyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">
              Confirm deletion
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to delete the faculty
              <span className="font-semibold"> {facultyToDelete.name} ({facultyToDelete.code})</span>?
              This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={cancelDeleteFaculty}
                disabled={Boolean(deletingId)}
              >
                No, keep it
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="button"
                onClick={confirmDeleteFaculty}
                disabled={Boolean(deletingId)}
              >
                {deletingId === facultyToDelete._id ? "Deleting..." : "Yes, delete it"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
