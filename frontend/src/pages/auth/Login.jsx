import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import Button from "../../components/Button";
import { loginUser } from "../../services/apiAuth";
import { saveSession } from "../../utils/authSession";

const roles = [
  { value: "admin", label: "Admin", icon: ShieldCheck },
  { value: "teacher", label: "Teacher", icon: GraduationCap },
  { value: "student", label: "Student", icon: UserRound },
];

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const nextErrors = {};
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      nextErrors.identifier =
        role === "admin" ? "Email should not be empty" : "Username should not be empty";
    } else if (role === "admin" && !/^[^\s@]+@gmail\.com$/i.test(trimmedIdentifier)) {
      nextErrors.identifier = "Invalid email format";
    }

    if (!password) {
      nextErrors.password = "Password should not be empty";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const applyLoginError = (message) => {
    const normalized = String(message || "").toLowerCase();
    if (normalized.includes("password")) {
      setFieldErrors({ password: message });
      return;
    }
    if (normalized.includes("email") || normalized.includes("username")) {
      setFieldErrors({ identifier: message });
      return;
    }
    setError(message || "Login failed. Please check your credentials.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await loginUser({
        role,
        identifier: identifier.trim(),
        password,
      });
      const userRole = response.data.user.role;
      saveSession({
        token: response.data.token,
        user: response.data.user,
      });
      navigate(userRole === "student" ? "/student/notices" : `/${userRole}/dashboard`);
    } catch (err) {
      applyLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === "admin";
  const fieldLabel = isAdmin ? "Email" : "Username";
  const fieldPlaceholder = isAdmin
    ? "admin@example.com"
    : "Enter your username";
  const inputClass = (hasError, extra = "") =>
    `w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium text-slate-950 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 ${
      hasError
        ? "border-red-300 focus:ring-red-400"
        : "border-slate-300 focus:ring-[var(--color-primary)]"
    } ${extra}`;

  return (
    <div className="h-svh overflow-hidden bg-[#f6f8fb] px-4 py-4 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid h-full w-full max-w-5xl items-center gap-5 lg:grid-cols-[0.92fr_1fr]">
        <section className="hidden h-full min-h-0 flex-col justify-center rounded-[2rem] border border-slate-200 bg-white px-10 py-8 shadow-sm lg:flex">
          {/* Logo + Brand */}
          <div>
            <div className="flex items-center gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]">
                <BookOpen className="h-7 w-7 text-white" />
              </div>

              <h1 className="m-0 text-4xl font-extrabold tracking-tight text-slate-950">
                EduPulse
              </h1>
            </div>

            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
              A Focused Academic Management Workspace for Administrators,
              Teachers, and Students.
            </p>
          </div>

          {/* Role Cards */}
          <div className="mt-8 grid gap-4">
            {roles.map((option) => {
              const Icon = option.icon;

              return (
                <div
                  key={option.value}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 transition-all hover:border-[var(--color-primary)] hover:bg-white"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--color-primary)] shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {option.label}
                    </p>

                    <p className="mt-0.5 text-sm text-slate-500">
                      Access your dedicated workspace
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <main className="flex h-full min-h-0 items-stretch justify-center">
          <div className="flex h-full w-full max-w-md flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]">
                <BookOpen className="h-6 w-6 text-white" />
              </div>

              <div>
                <h1 className="m-0 text-2xl font-extrabold leading-none text-slate-950">
                  EduPulse
                </h1>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Academic Management System
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-primary)]">
                Welcome back
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                Sign in to continue
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-1 flex-col justify-between"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Login as
                  </label>

                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
                    {roles.map((option) => {
                      const Icon = option.icon;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setRole(option.value);
                            setIdentifier("");
                            setPassword("");
                            setError("");
                            setFieldErrors({});
                          }}
                          className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition ${
                            role === option.value
                              ? "bg-white text-[var(--color-primary)] shadow-sm"
                              : "text-slate-600 hover:text-slate-950"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="identifier"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    {fieldLabel}
                  </label>

                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      setError("");
                      setFieldErrors((current) => ({ ...current, identifier: "" }));
                    }}
                    placeholder={fieldPlaceholder}
                    aria-invalid={Boolean(fieldErrors.identifier)}
                    className={inputClass(Boolean(fieldErrors.identifier))}
                  />
                  {fieldErrors.identifier && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      {fieldErrors.identifier}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError("");
                        setFieldErrors((current) => ({ ...current, password: "" }));
                      }}
                      placeholder="Enter your password"
                      aria-invalid={Boolean(fieldErrors.password)}
                      className={inputClass(Boolean(fieldErrors.password), "pr-12")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                  </p>
                )}
              </div>

              <div className="mt-8">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full rounded-2xl"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
