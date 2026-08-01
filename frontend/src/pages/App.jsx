import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getStoredSession } from "../utils/authSession";
import AdminLayout from "../layouts/AdminLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import StudentLayout from "../layouts/StudentLayout";
import Login from "./auth/Login";
import Dashboard from "./admin/Dashboard";
import Academics from "./admin/Academics";
import Exams from "./admin/Exams";
import AdminQuizzes from "./admin/Quizzes";
import Notices from "./admin/Notices";
import Attendance from "./admin/Attendance";
import StudentPerformance from "./admin/StudentPerformance";
import ChangePassword from "./admin/ChangePassword";
import FacultyManagement from "./admin/academics/FacultyManagement";
import StudentPerformanceDetail from "./admin/academics/StudentPerformanceDetailWithExamFilter";
import NotFoundPage from "./NotFoundPage";
import TeacherDashboard from "./teacher/Dashboard";
import TeacherAttendance from "./teacher/Attendance";
import TeacherMarks from "./teacher/Marks";
import TeacherQuizzes from "./teacher/Quizzes";
import TeacherResources from "./teacher/Resources";
import StudentNotices from "./student/Notices";
import StudentAcademics from "./student/Academics";
import StudentAttendance from "./student/Attendance";
import StudentResources from "./student/Resources";
import StudentQuizzes from "./student/Quizzes";

function RequireAuth({ role, children }) {
  return getStoredSession(role) ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="academics" element={<Academics />} />
          <Route path="academics/faculties" element={<FacultyManagement />} />
          <Route
            path="academics/students/:studentId"
            element={<StudentPerformanceDetail />}
          />
          <Route path="exams" element={<Exams />} />
          <Route path="quizzes" element={<AdminQuizzes />} />
          <Route path="notices" element={<Notices />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="student-performance" element={<StudentPerformance />} />
          <Route
            path="student-performance/:studentId"
            element={<StudentPerformance />}
          />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
        <Route
          path="/teacher"
          element={
            <RequireAuth role="teacher">
              <TeacherLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="marks" element={<TeacherMarks />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="resources" element={<TeacherResources />} />
          <Route
            path="change-password"
            element={<ChangePassword accountLabel="teacher" />}
          />
        </Route>
        <Route
          path="/student"
          element={
            <RequireAuth role="student">
              <StudentLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="notices" replace />} />
          <Route path="notices" element={<StudentNotices />} />
          <Route path="academics" element={<StudentAcademics />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="quizzes" element={<StudentQuizzes />} />
          <Route path="resources" element={<StudentResources />} />
          <Route
            path="change-password"
            element={<ChangePassword accountLabel="student" />}
          />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
