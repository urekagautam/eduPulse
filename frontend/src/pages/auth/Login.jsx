import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import Button from "../../components/Button";
import { loginUser } from "../../services/apiAuth";
import { saveSession } from "../../utils/authSession";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
];

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await loginUser({ role, identifier, password });
      const userRole = response.data.user.role;
      saveSession({
        token: response.data.token,
        user: response.data.user,
      });
      navigate(`/${userRole}/dashboard`);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === "admin";
  const fieldLabel = isAdmin ? "Email" : "Username";
  const fieldPlaceholder = isAdmin
    ? "admin@example.com"
    : "Enter your username";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgba(124,58,237,0.08)] via-[rgba(16,185,129,0.06)] to-[rgba(124,58,237,0.08)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-200">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-3xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-[var(--color-primary-foreground)]" />
            </div>
          </div>

          <h1 className="text-center text-3xl font-bold text-gray-900 mb-2">
            eduPulse
          </h1>
          <p className="text-center text-gray-600 text-sm mb-8">
            Exam Management System
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Login as
              </label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`py-2.5 px-3 rounded-2xl font-medium text-sm transition ${
                      role === option.value
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="identifier"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                {fieldLabel}
              </label>
              <input
                id="identifier"
                type={isAdmin ? "email" : "text"}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                placeholder={fieldPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl text-sm text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
