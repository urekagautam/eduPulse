import { useState } from "react";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import Button from "../../components/Button";
import { changePassword as apiChangePassword } from "../../services/apiAuth";

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

const PasswordField = ({
  label,
  value,
  onChange,
  show,
  toggleShow,
  autoComplete,
}) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-gray-700">
      {label}
    </label>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        className={`${inputClass} pr-10`}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>
);

export default function ChangePassword({ accountLabel = "admin" }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (form.currentPassword === form.newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    // Call backend API
    apiChangePassword(form.currentPassword, form.newPassword)
      .then(() => {
        setSuccess(true);
        setError("");
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      })
      .catch((err) => {
        setError(err.message || "Failed to change password");
      });
  };

  return (
    <div
      className="mx-auto max-w-xl space-y-4"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <div>
        <h1 className="text-xl font-bold text-gray-900">Change Password</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update your {accountLabel} account password
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-3 rounded-lg bg-[var(--color-primary-bg)] px-4 py-3 text-sm text-[var(--color-primary-strong)]">
          <Lock className="h-5 w-5 shrink-0" />
          <p>Use at least 8 characters with a mix of letters and numbers.</p>
        </div>

        <PasswordField
          label="Current Password"
          value={form.currentPassword}
          onChange={(v) => setForm({ ...form, currentPassword: v })}
          show={show.current}
          toggleShow={() => setShow({ ...show, current: !show.current })}
          autoComplete="current-password"
        />

        <PasswordField
          label="New Password"
          value={form.newPassword}
          onChange={(v) => setForm({ ...form, newPassword: v })}
          show={show.new}
          toggleShow={() => setShow({ ...show, new: !show.new })}
          autoComplete="new-password"
        />

        <PasswordField
          label="Confirm New Password"
          value={form.confirmPassword}
          onChange={(v) => setForm({ ...form, confirmPassword: v })}
          show={show.confirm}
          toggleShow={() => setShow({ ...show, confirm: !show.confirm })}
          autoComplete="new-password"
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Password updated successfully.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              setError("");
              setSuccess(false);
            }}
          >
            Clear
          </Button>
          <Button type="submit" variant="primary">
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
}
