import dotenv from "dotenv";
import express from "express";
import connectDB from "./db/index.js";

import authRoute from "./routes/auth.route.js";
import facultyRoute from "./routes/faculty.route.js";
import studentRoute from "./routes/student.route.js";
import subjectRoute from "./routes/subject.route.js";
import teacherRoute from "./routes/teacher.route.js";
import examRoute from "./routes/exam.route.js";
import performanceRoute from "./routes/performance.route.js";
import teacherMarksRoute from "./routes/teacherMarks.route.js";
import noticeRoute from "./routes/notice.route.js";
import resourceRoute from "./routes/resource.route.js";
import attendanceRoute from "./routes/attendance.route.js";
import quizRoute from "./routes/quiz.route.js";
import dashboardRoute from "./routes/dashboard.route.js";

dotenv.config();

const app = express();

// Ensure CORS headers are set before body parsing so they are returned
// even when the body parser rejects large payloads (413).
app.use((req, res, next) => {
  const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Increase JSON body size limit to accommodate Base64 image payloads.
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/admin", authRoute);
app.use("/api/admin/faculties", facultyRoute);
app.use("/api/admin/students", studentRoute);
app.use("/api/admin/subjects", subjectRoute);
app.use("/api/admin/teachers", teacherRoute);
app.use("/api/admin/exams", examRoute);
app.use("/api/admin/performance", performanceRoute);
app.use("/api/teacher/marks", teacherMarksRoute);
app.use("/api/notices", noticeRoute);
app.use("/api/resources", resourceRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/quizzes", quizRoute);
app.use("/api/dashboard", dashboardRoute);

app.get("/", (req, res) => {
  res.send("Server is ready");
});

// Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  // Log full error for debugging
  console.error("[global error handler]", err && err.stack ? err.stack : err);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    errors: err.errors || [],
  });
});

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
