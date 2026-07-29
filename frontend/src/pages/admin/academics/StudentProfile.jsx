import { useState, useEffect } from "react";
import { X, KeyRound } from "lucide-react";
import Button from "../../../components/Button";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

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

const Field = ({ label, children, optional }) => (
  <div>
    <label className={labelClass}>
      {label}
      {optional && (
        <span className="font-normal text-gray-500"> (optional)</span>
      )}
    </label>
    {children}
  </div>
);

export default function StudentProfile({
  isOpen,
  onClose,
  onSave,
  faculty,
  currentLevel,
  student = null,
}) {
  const [form, setForm] = useState(emptyForm());
  const [newStudentCreds, setNewStudentCreds] = useState(null);
  const [error, setError] = useState("");
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
  }, [student, isOpen]);

  if (!isOpen) return null;

  const getLevelLabel = (struct, lvl) => {
    const SEMESTER_NAMES = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];
    const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];
    const names = struct === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
    const name = names[lvl - 1] || `Level ${lvl}`;
    return struct === "semester" ? `${name} Semester` : `${name} Year`;
  };

  const levelLabel = faculty ? getLevelLabel(faculty.structureType, Number(currentLevel)) : "";

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.firstName || !form.lastName || !form.studentId || !form.admittedBatch || !form.mobile || !form.email || !form.gender) {
      setError("Please fill in all required fields.");
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
      setError(err?.message || "Failed to save student.");
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

        {/* Selected Context Informative Panel */}
        <div className="bg-[var(--color-primary-bg)] border-l-4 border-[var(--color-primary-border)] p-4 mb-6 rounded-r-lg text-sm text-[var(--color-primary-strong)]">
          <span className="font-semibold block mb-1">Enrolling Target Context (Auto-set from Filter):</span>
          <p>
            Program: <strong className="font-semibold">{faculty?.name} ({faculty?.code})</strong> · 
            Class: <strong className="font-semibold">{levelLabel}</strong>
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Admission & Core Identifiers */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2 text-lg">
              Admission Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Admitted Batch">
                <input
                  className={inputClass}
                  value={form.admittedBatch}
                  onChange={(e) =>
                    setForm({ ...form, admittedBatch: e.target.value })
                  }
                  placeholder="e.g. 2081"
                  required
                />
              </Field>
              <Field label="Student ID">
                <input
                  className={inputClass}
                  value={form.studentId}
                  onChange={(e) =>
                    setForm({ ...form, studentId: e.target.value })
                  }
                  placeholder="BCA-2081-001"
                  required
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
              <Field label="Mobile No.">
                <input
                  className={inputClass}
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="e.g. 98XXXXXXXX"
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. email@domain.com"
                  required
                />
              </Field>
              <Field label="Gender">
                <select
                  className={selectClass}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  required
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
                  onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                  placeholder="e.g. A+, O-"
                />
              </Field>
              <Field label="Citizenship No." optional>
                <input
                  className={inputClass}
                  value={form.citizenshipNo}
                  onChange={(e) => setForm({ ...form, citizenshipNo: e.target.value })}
                />
              </Field>
              <Field label="University Reg. No." optional>
                <input
                  className={inputClass}
                  value={form.universityRegNo}
                  onChange={(e) => setForm({ ...form, universityRegNo: e.target.value })}
                />
              </Field>
              <Field label="University Symbol No." optional>
                <input
                  className={inputClass}
                  value={form.universitySymbolNo}
                  onChange={(e) => setForm({ ...form, universitySymbolNo: e.target.value })}
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
              <Field label="Guardian Name" optional>
                <input
                  className={inputClass}
                  value={form.guardianName}
                  onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                />
              </Field>
              <Field label="Guardian Mobile" optional>
                <input
                  className={inputClass}
                  value={form.guardianMobile}
                  onChange={(e) => setForm({ ...form, guardianMobile: e.target.value })}
                />
              </Field>
              <Field label="Father's Name" optional>
                <input
                  className={inputClass}
                  value={form.fatherName}
                  onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                />
              </Field>
              <Field label="Father's Mobile" optional>
                <input
                  className={inputClass}
                  value={form.fatherMobile}
                  onChange={(e) => setForm({ ...form, fatherMobile: e.target.value })}
                />
              </Field>
              <Field label="Mother's Name" optional>
                <input
                  className={inputClass}
                  value={form.motherName}
                  onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                />
              </Field>
              <Field label="Mother's Mobile" optional>
                <input
                  className={inputClass}
                  value={form.motherMobile}
                  onChange={(e) => setForm({ ...form, motherMobile: e.target.value })}
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
