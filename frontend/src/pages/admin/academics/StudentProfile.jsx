import { useState, useEffect } from "react";
import { X, KeyRound } from "lucide-react";
import Button from "../../../components/Button";
import {
  validateEmail,
  validateName,
  validateNepalMobile,
} from "../../../validations/personValidation";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";
const errorClass = "mt-1 text-xs font-medium text-red-600";

const emptyForm = () => ({
  firstName: "",
  middleName: "",
  lastName: "",
  studentId: "",
  mobile: "",
  email: "",
  gender: "",
  bloodGroup: "",
  citizenshipNo: "",
  universityRegNo: "",
  universitySymbolNo: "",
  guardianName: "",
  guardianMobile: "",
  fatherName: "",
  motherName: "",
  fatherMobile: "",
  motherMobile: "",
  admittedBatch: "",
});

function generatePassword() {
  return `Tmp@${Math.random().toString(36).slice(2, 10)}`;
}

function generateUsername(firstName, lastName, studentId) {
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, "");
  return base || studentId?.toLowerCase() || `user${Date.now()}`;
}

const Field = ({ label, children, optional, error }) => (
  <div>
    <label className={labelClass}>
      {label}
      {optional && (
        <span className="font-normal text-gray-500"> (optional)</span>
      )}
    </label>
    {children}
    {error && <p className={errorClass}>{error}</p>}
  </div>
);

export default function StudentProfile({
  isOpen,
  onClose,
  onSave,
  faculty,
  currentLevel,
  student = null,
  students = [],
  teachers = [],
}) {
  const [form, setForm] = useState(emptyForm());
  const [newStudentCreds, setNewStudentCreds] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        firstName: student.profile?.firstName || "",
        middleName: student.profile?.middleName || "",
        lastName: student.profile?.lastName || "",
        studentId: student.studentId || "",
        mobile: student.profile?.mobile || "",
        email: student.profile?.email || "",
        gender: student.profile?.gender || "",
        bloodGroup: student.profile?.bloodGroup || "",
        citizenshipNo: student.profile?.citizenshipNo || "",
        universityRegNo: student.universityRegNo || "",
        universitySymbolNo: student.universitySymbolNo || "",
        guardianName: student.guardian?.name || "",
        guardianMobile: student.guardian?.mobile || "",
        fatherName: student.guardian?.fatherName || "",
        motherName: student.guardian?.motherName || "",
        fatherMobile: student.guardian?.fatherMobile || "",
        motherMobile: student.guardian?.motherMobile || "",
        admittedBatch: student.admission?.batch || "",
      });
      setNewStudentCreds(student.credentials || null);
    } else {
      setForm(emptyForm());
      setNewStudentCreds(null);
    }
    setError("");
    setFieldErrors({});
  }, [student, isOpen]);

  if (!isOpen) return null;

  const getInputClass = (fieldName, baseClass = inputClass) =>
    `${baseClass} ${fieldErrors[fieldName] ? "border-red-400 focus:ring-red-400" : ""}`;

  const updateField = (fieldName, value) => {
    setForm((current) => ({ ...current, [fieldName]: value }));
    if (fieldErrors[fieldName]) {
      setFieldErrors((current) => ({ ...current, [fieldName]: "" }));
    }
  };

  const getStudentFieldErrors = () => ({
    admittedBatch: !String(form.admittedBatch || "").trim()
      ? "Admitted batch is required."
      : "",
    studentId: !String(form.studentId || "").trim()
      ? "Student ID is required."
      : "",
    firstName: validateName(form.firstName, "First name"),
    middleName: validateName(form.middleName, "Middle name", {
      required: false,
    }),
    lastName: validateName(form.lastName, "Last name"),
    mobile: validateNepalMobile(form.mobile, "Mobile number"),
    email: validateEmail(form.email),
    gender: !form.gender ? "Gender is required." : "",
    guardianName: validateName(form.guardianName, "Guardian name", {
      required: false,
    }),
    guardianMobile: validateNepalMobile(form.guardianMobile, "Guardian mobile", {
      required: false,
    }),
    fatherName: validateName(form.fatherName, "Father's name", {
      required: false,
    }),
    fatherMobile: validateNepalMobile(form.fatherMobile, "Father's mobile", {
      required: false,
    }),
    motherName: validateName(form.motherName, "Mother's name", {
      required: false,
    }),
    motherMobile: validateNepalMobile(form.motherMobile, "Mother's mobile", {
      required: false,
    }),
  });

  const getDuplicateFieldErrors = () => {
    const studentId = String(form.studentId || "").trim().toLowerCase();
    const email = String(form.email || "").trim().toLowerCase();
    const mobile = String(form.mobile || "").trim();
    const currentStudentId = student?._id;

    const duplicateStudentId = students.some(
      (item) =>
        item._id !== currentStudentId &&
        String(item.studentId || "").trim().toLowerCase() === studentId,
    );
    const duplicateStudentEmail = students.some(
      (item) =>
        item._id !== currentStudentId &&
        String(item.profile?.email || "").trim().toLowerCase() === email,
    );
    const duplicateTeacherEmail = teachers.some(
      (item) =>
        String(item.profile?.email || "").trim().toLowerCase() === email,
    );
    const duplicateStudentPhone = students.some(
      (item) =>
        item._id !== currentStudentId &&
        String(item.profile?.mobile || "").trim() === mobile,
    );
    const duplicateTeacherPhone = teachers.some(
      (item) => String(item.profile?.phone || "").trim() === mobile,
    );

    return {
      studentId: studentId && duplicateStudentId ? "Student ID already exists." : "",
      email: email && (duplicateStudentEmail || duplicateTeacherEmail)
        ? "Email already exists."
        : "",
      mobile: mobile && (duplicateStudentPhone || duplicateTeacherPhone)
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
      setFieldErrors({ mobile: "Phone number already exists." });
      return;
    }
    if (/mobile number|phone number/i.test(message)) {
      setFieldErrors({ mobile: "Invalid phone number." });
      return;
    }
    if (/student id already exists/i.test(message)) {
      setFieldErrors({ studentId: "Student ID already exists." });
      return;
    }
    setError(message);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    const validationErrors = getStudentFieldErrors();
    const duplicateErrors = getDuplicateFieldErrors();
    const nextFieldErrors = {
      ...validationErrors,
      studentId: validationErrors.studentId || duplicateErrors.studentId,
      email: validationErrors.email || duplicateErrors.email,
      mobile: validationErrors.mobile || duplicateErrors.mobile,
    };
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) {
      return;
    }

    setSaving(true);
    try {
      const username = newStudentCreds?.username || generateUsername(form.firstName, form.lastName, form.studentId);
      const password = newStudentCreds?.password || (student ? undefined : generatePassword());

      const payload = {
        studentId: form.studentId,
        universityRegNo: form.universityRegNo,
        universitySymbolNo: form.universitySymbolNo,
        profile: {
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          email: form.email,
          mobile: form.mobile,
          citizenshipNo: form.citizenshipNo,
        },
        guardian: {
          name: form.guardianName,
          mobile: form.guardianMobile,
          fatherName: form.fatherName,
          motherName: form.motherName,
          fatherMobile: form.fatherMobile,
          motherMobile: form.motherMobile,
        },
        admission: {
          facultyId: faculty?._id || faculty?.id,
          batch: form.admittedBatch,
        },
        enrollment: {
          currentLevel: Number(currentLevel),
        },
        credentials: {
          username,
          ...(password ? { password } : {}),
        },
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
      applyBackendError(err?.message || "Failed to save student.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto p-4 md:p-10">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {student ? "Edit Student Profile" : "Create Student Profile"}
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
          {/* Section 1: Admission & Core Identifiers */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2 text-lg">
              Admission Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Admitted Batch" error={fieldErrors.admittedBatch}>
                <input
                  className={getInputClass("admittedBatch")}
                  value={form.admittedBatch}
                  onChange={(e) =>
                    updateField("admittedBatch", e.target.value)
                  }
                  placeholder="e.g. 2081"
                />
              </Field>
              <Field label="Student ID" error={fieldErrors.studentId}>
                <input
                  className={getInputClass("studentId")}
                  value={form.studentId}
                  onChange={(e) =>
                    updateField("studentId", e.target.value)
                  }
                  placeholder="BCA-2081-001"
                />
              </Field>
            </div>
          </div>

          {/* Section 2: Personal details */}
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
              <Field label="Mobile No." error={fieldErrors.mobile}>
                <input
                  className={getInputClass("mobile")}
                  value={form.mobile}
                  onChange={(e) => updateField("mobile", e.target.value)}
                  placeholder="e.g. 98XXXXXXXX"
                />
              </Field>
              <Field label="Email" error={fieldErrors.email}>
                <input
                  type="email"
                  className={getInputClass("email")}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="e.g. email@domain.com"
                />
              </Field>
              <Field label="Gender" error={fieldErrors.gender}>
                <select
                  className={getInputClass("gender", selectClass)}
                  value={form.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Blood Group" optional>
                <input
                  className={inputClass}
                  value={form.bloodGroup}
                  onChange={(e) => updateField("bloodGroup", e.target.value)}
                  placeholder="e.g. A+, O-"
                />
              </Field>
              <Field label="Citizenship No." optional>
                <input
                  className={inputClass}
                  value={form.citizenshipNo}
                  onChange={(e) => updateField("citizenshipNo", e.target.value)}
                />
              </Field>
              <Field label="University Reg. No." optional>
                <input
                  className={inputClass}
                  value={form.universityRegNo}
                  onChange={(e) => updateField("universityRegNo", e.target.value)}
                />
              </Field>
              <Field label="University Symbol No." optional>
                <input
                  className={inputClass}
                  value={form.universitySymbolNo}
                  onChange={(e) => updateField("universitySymbolNo", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Section 3: Guardian & parents */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2 text-lg">
              Guardian & Parent Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Guardian Name" optional error={fieldErrors.guardianName}>
                <input
                  className={getInputClass("guardianName")}
                  value={form.guardianName}
                  onChange={(e) => updateField("guardianName", e.target.value)}
                />
              </Field>
              <Field label="Guardian Mobile" optional error={fieldErrors.guardianMobile}>
                <input
                  className={getInputClass("guardianMobile")}
                  value={form.guardianMobile}
                  onChange={(e) => updateField("guardianMobile", e.target.value)}
                />
              </Field>
              <Field label="Father's Name" optional error={fieldErrors.fatherName}>
                <input
                  className={getInputClass("fatherName")}
                  value={form.fatherName}
                  onChange={(e) => updateField("fatherName", e.target.value)}
                />
              </Field>
              <Field label="Father's Mobile" optional error={fieldErrors.fatherMobile}>
                <input
                  className={getInputClass("fatherMobile")}
                  value={form.fatherMobile}
                  onChange={(e) => updateField("fatherMobile", e.target.value)}
                />
              </Field>
              <Field label="Mother's Name" optional error={fieldErrors.motherName}>
                <input
                  className={getInputClass("motherName")}
                  value={form.motherName}
                  onChange={(e) => updateField("motherName", e.target.value)}
                />
              </Field>
              <Field label="Mother's Mobile" optional error={fieldErrors.motherMobile}>
                <input
                  className={getInputClass("motherMobile")}
                  value={form.motherMobile}
                  onChange={(e) => updateField("motherMobile", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Section 4: Login credentials preview */}
          {!student && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Login credentials preview
              </p>
              {newStudentCreds ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">Username (Auto-generated)</span>
                    <p className="font-mono font-semibold">
                      {newStudentCreds.username}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">Password (Temporary)</span>
                    <p className="font-mono font-semibold">
                      {newStudentCreds.password}
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    const u = generateUsername(
                      form.firstName,
                      form.lastName,
                      form.studentId
                    );
                    setNewStudentCreds({
                      username: u,
                      password: generatePassword(),
                    });
                  }}
                  disabled={!form.firstName || !form.lastName || !form.studentId}
                >
                  Preview generated credentials
                </Button>
              )}
            </div>
          )}

          {/* Form Actions */}
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
              {saving ? "Saving..." : student ? "Update Student" : "Save Student"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
