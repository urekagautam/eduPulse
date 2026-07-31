import { useEffect, useState } from "react";
import { X, KeyRound } from "lucide-react";
import Button from "../../../components/Button";
import {
  validateEmail,
  validateName,
  validateNepalMobile,
} from "../../../validations/personValidation";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";
const errorClass = "mt-1 text-xs font-medium text-red-600";

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

const Field = ({ label, children, optional, error }) => (
  <div>
    <label className={labelClass}>
      {label}
      {optional && <span className="font-normal text-gray-500"> (optional)</span>}
    </label>
    {children}
    {error && <p className={errorClass}>{error}</p>}
  </div>
);

export default function TeacherProfile({
  isOpen,
  onClose,
  onSave,
  teacher = null,
  students = [],
  teachers = [],
}) {
  const [form, setForm] = useState(emptyForm());
  const [newTeacherCreds, setNewTeacherCreds] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
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
    setFieldErrors({});
  }, [teacher, isOpen]);

  if (!isOpen) return null;

  const getInputClass = (fieldName) =>
    `${inputClass} ${fieldErrors[fieldName] ? "border-red-400 focus:ring-red-400" : ""}`;

  const updateField = (fieldName, value) => {
    setForm((current) => ({ ...current, [fieldName]: value }));
    if (fieldErrors[fieldName]) {
      setFieldErrors((current) => ({ ...current, [fieldName]: "" }));
    }
  };

  const getTeacherFieldErrors = () => ({
    firstName: validateName(form.firstName, "First name"),
    middleName: validateName(form.middleName, "Middle name", {
      required: false,
    }),
    lastName: validateName(form.lastName, "Last name"),
    phone: validateNepalMobile(form.phone, "Phone number"),
    email: validateEmail(form.email),
  });

  const getDuplicateFieldErrors = () => {
    const email = String(form.email || "").trim().toLowerCase();
    const phone = String(form.phone || "").trim();
    const currentTeacherId = teacher?._id;

    const duplicateTeacherEmail = teachers.some(
      (item) =>
        item._id !== currentTeacherId &&
        String(item.profile?.email || "").trim().toLowerCase() === email,
    );
    const duplicateStudentEmail = students.some(
      (item) =>
        String(item.profile?.email || "").trim().toLowerCase() === email,
    );
    const duplicateTeacherPhone = teachers.some(
      (item) =>
        item._id !== currentTeacherId &&
        String(item.profile?.phone || "").trim() === phone,
    );
    const duplicateStudentPhone = students.some(
      (item) => String(item.profile?.mobile || "").trim() === phone,
    );

    return {
      email: email && (duplicateTeacherEmail || duplicateStudentEmail)
        ? "Email already exists."
        : "",
      phone: phone && (duplicateTeacherPhone || duplicateStudentPhone)
        ? "Phone number already exists."
        : "",
    };
  };

  const applyBackendError = (message) => {
    if (/email already exists/i.test(message)) {
      setFieldErrors({ email: "Email already exists." });
      return;
    }
    if (/phone number already exists/i.test(message)) {
      setFieldErrors({ phone: "Phone number already exists." });
      return;
    }
    if (/mobile number|phone number/i.test(message)) {
      setFieldErrors({ phone: "Invalid phone number." });
      return;
    }
    setError(message);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    const validationErrors = getTeacherFieldErrors();
    const duplicateErrors = getDuplicateFieldErrors();
    const nextFieldErrors = {
      ...validationErrors,
      email: validationErrors.email || duplicateErrors.email,
      phone: validationErrors.phone || duplicateErrors.phone,
    };
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) {
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
      applyBackendError(err?.message || "Failed to save teacher.");
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

        <form onSubmit={handleSave} className="space-y-8" noValidate>
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2 text-lg">
              Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="First Name" error={fieldErrors.firstName}>
                <input
                  className={getInputClass("firstName")}
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
              </Field>
              <Field label="Middle Name" optional error={fieldErrors.middleName}>
                <input
                  className={getInputClass("middleName")}
                  value={form.middleName}
                  onChange={(e) => updateField("middleName", e.target.value)}
                />
              </Field>
              <Field label="Last Name" error={fieldErrors.lastName}>
                <input
                  className={getInputClass("lastName")}
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
              </Field>
              <Field label="Phone No." error={fieldErrors.phone}>
                <input
                  className={getInputClass("phone")}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </Field>
              <Field label="Email" error={fieldErrors.email}>
                <input
                  type="email"
                  className={getInputClass("email")}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </Field>
              <div className="md:col-span-3">
                <Field label="Address" optional>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
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
