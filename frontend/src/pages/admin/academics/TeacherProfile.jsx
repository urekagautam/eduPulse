import { useEffect, useState } from "react";
import { X, KeyRound } from "lucide-react";
import Button from "../../../components/Button";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const emptyForm = () => ({
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
});

function generatePassword() {
  return `Tmp@${Math.random().toString(36).slice(2, 10)}`;
}

function generateUsername(firstName, lastName) {
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, "");
  return base || `teacher${Date.now()}`;
}

const Field = ({ label, children, optional }) => (
  <div>
    <label className={labelClass}>
      {label}
      {optional && <span className="font-normal text-gray-500"> (optional)</span>}
    </label>
    {children}
  </div>
);

export default function TeacherProfile({
  isOpen,
  onClose,
  onSave,
  teacher = null,
}) {
  const [form, setForm] = useState(emptyForm());
  const [newTeacherCreds, setNewTeacherCreds] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teacher) {
      setForm({
        firstName: teacher.profile?.firstName || "",
        middleName: teacher.profile?.middleName || "",
        lastName: teacher.profile?.lastName || "",
        phone: teacher.profile?.phone || "",
        email: teacher.profile?.email || "",
        address: teacher.profile?.address || "",
      });
      setNewTeacherCreds(teacher.credentials || null);
    } else {
      setForm(emptyForm());
      setNewTeacherCreds(null);
    }
    setError("");
  }, [teacher, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.firstName || !form.lastName || !form.phone || !form.email) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const username =
        newTeacherCreds?.username || generateUsername(form.firstName, form.lastName);
      const password =
        newTeacherCreds?.password || (teacher ? undefined : generatePassword());

      await onSave({
        profile: {
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          address: form.address,
        },
        credentials: {
          username,
          ...(password ? { password } : {}),
        },
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to save teacher.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto p-4 md:p-10">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {teacher ? "Edit Teacher Profile" : "Create Teacher Profile"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-sm text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2 text-lg">
              Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="First Name">
                <input
                  className={inputClass}
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Middle Name" optional>
                <input
                  className={inputClass}
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                />
              </Field>
              <Field label="Last Name">
                <input
                  className={inputClass}
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Phone No.">
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Field>
              <div className="md:col-span-3">
                <Field label="Address" optional>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>

          {!teacher && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Login credentials preview
              </p>
              {newTeacherCreds ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">
                      Username (Auto-generated)
                    </span>
                    <p className="font-mono font-semibold">
                      {newTeacherCreds.username}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">
                      Password (Temporary)
                    </span>
                    <p className="font-mono font-semibold">
                      {newTeacherCreds.password}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() =>
                    setNewTeacherCreds({
                      username: generateUsername(form.firstName, form.lastName),
                      password: generatePassword(),
                    })
                  }
                  disabled={!form.firstName || !form.lastName}
                >
                  Preview generated credentials
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : teacher ? "Update Teacher" : "Save Teacher"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
