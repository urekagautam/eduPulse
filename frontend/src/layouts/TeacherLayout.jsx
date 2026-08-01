import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  BookOpen,
  FileQuestion,
  KeyRound,
} from "lucide-react";
import { clearSession, getStoredUser } from "../utils/authSession";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/teacher/dashboard" },
  { icon: ClipboardList, label: "Attendance", path: "/teacher/attendance" },
  { icon: TrendingUp, label: "Marks", path: "/teacher/marks" },
  { icon: FileQuestion, label: "Quizzes", path: "/teacher/quizzes" },
  { icon: BookOpen, label: "Resources", path: "/teacher/resources" },
  { icon: KeyRound, label: "Change Password", path: "/teacher/change-password" },
];

export default function TeacherLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const navButtonClass = (isActive) =>
    [
      "w-full flex items-center rounded-xl text-gray-600 transition-all",
      sidebarOpen ? "gap-3 px-4 py-3" : "justify-center p-3",
      isActive
        ? "bg-[var(--color-primary-bg)] text-[var(--color-primary)]"
        : "hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]",
    ].join(" ");

  return (
    <div className="flex h-screen bg-gray-50 font-sans role-teacher">
      <div
        className={`${sidebarOpen ? "w-64" : "w-[4.5rem]"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-sm shrink-0`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 bg-[var(--color-primary)]">
                T
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-800 truncate tracking-tight">
                  Teacher
                </p>
                <p className="text-xs font-medium text-gray-500 truncate">
                  {currentUser.username || "teacher account"}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0 ${
              sidebarOpen ? "" : "mx-auto"
            }`}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-500" />
            ) : (
              <Menu className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={navButtonClass(isActive)}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon
                  className="w-5 h-5 shrink-0"
                  strokeWidth={isActive ? 2.25 : 2}
                />
                {sidebarOpen && (
                  <span className="font-semibold text-sm truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center rounded-xl text-red-500 hover:bg-red-50 transition-all ${
              sidebarOpen ? "gap-3 px-4 py-3" : "justify-center p-3"
            }`}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && (
              <span className="font-semibold text-sm">Logout</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-w-0">
        <div className="p-9">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
