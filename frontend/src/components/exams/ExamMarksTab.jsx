import { useState, useMemo } from "react";
import {
  FACULTY_CATALOG,
  DUMMY_SUBJECTS,
  getFacultyByCode,
  getLevelOptionsForFacultyCode,
  getLevelLabel,
} from "../../data/examDummyData";
import {
  loadExamMarks,
  saveExamMarks,
  loadExamAttendance,
  saveExamAttendance,
} from "../../utils/examStorage";
import Button from "../Button";
import { Plus, Trash2, Check } from "lucide-react";

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const DUMMY_RESULT_STUDENTS = [
  {
    studentId: "BCA-2086-001",
    rollNo: "7830011",
    name: "Ajay Sharma",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    studentId: "BCA-2086-002",
    rollNo: "7830012",
    name: "Mina Koirala",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    studentId: "BCA-2086-003",
    rollNo: "7830013",
    name: "Nikita Thapa",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    studentId: "BCA-2086-004",
    rollNo: "7830014",
    name: "Pratik Adhikari",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
  {
    studentId: "BCA-2086-005",
    rollNo: "7830015",
    name: "Suresh Singh",
    admission: { facultyId: "fac_bca", facultyCode: "BCA", batch: "2086" },
    enrollment: {
      status: "active",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
    },
  },
];

export default function ExamMarksTab({ schedules }) {
  const [selectedFaculty, setSelectedFaculty] = useState("BCA");
  const [selectedLevel, setSelectedLevel] = useState("3");
  const [selectedBatch, setSelectedBatch] = useState("2086");
  const [selectedExamId, setSelectedExamId] = useState("exam-1");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [marks, setMarks] = useState(() => loadExamMarks());
  const [attendance, setAttendance] = useState(() => loadExamAttendance());
  const [savedMessage, setSavedMessage] = useState("");

  const faculty = getFacultyByCode(selectedFaculty);
  const levelOptions = useMemo(
    () => getLevelOptionsForFacultyCode(selectedFaculty),
    [selectedFaculty],
  );

  const currentSchedule = schedules.find(
    (s) => s.facultyCode === selectedFaculty && s.level === selectedLevel,
  );

  const availableSubjects = useMemo(
    () =>
      DUMMY_SUBJECTS.filter(
        (sub) =>
          sub.facultyCode === selectedFaculty &&
          sub.level === Number(selectedLevel),
      ),
    [selectedFaculty, selectedLevel],
  );

  const availableExams = useMemo(
    () => currentSchedule?.exams || [],
    [currentSchedule],
  );

  const classStudents = useMemo(
    () =>
      DUMMY_RESULT_STUDENTS.filter(
        (student) =>
          student.admission.facultyCode === selectedFaculty &&
          String(student.enrollment.currentLevel) === selectedLevel &&
          student.admission.batch === selectedBatch,
      ),
    [selectedFaculty, selectedLevel, selectedBatch],
  );

  const handleMarkChange = (studentId, subjectId, value) => {
    const val =
      value === "" ? 0 : Math.min(100, Math.max(0, parseInt(value) || 0));
    setMarks((prev) => {
      const existing = prev.find(
        (m) =>
          m.studentId === studentId &&
          m.examId === selectedExamId &&
          m.subjectId === subjectId,
      );
      if (existing) {
        return prev.map((m) =>
          m.studentId === studentId &&
          m.examId === selectedExamId &&
          m.subjectId === subjectId
            ? { ...m, obtainedMarks: val }
            : m,
        );
      }
      return [
        ...prev,
        {
          studentId,
          examId: selectedExamId,
          subjectId,
          obtainedMarks: val,
        },
      ];
    });
  };

  const handleAbsenceToggle = (studentId) => {
    setAttendance((prev) => {
      const existing = prev.find(
        (a) => a.studentId === studentId && a.examId === selectedExamId,
      );
      if (existing) {
        return prev.map((a) =>
          a.studentId === studentId && a.examId === selectedExamId
            ? { ...a, isAbsent: !a.isAbsent }
            : a,
        );
      }
      return [
        ...prev,
        {
          studentId,
          examId: selectedExamId,
          isAbsent: true,
        },
      ];
    });
  };

  const getMark = (studentId, subjectId) => {
    const mark = marks.find(
      (m) =>
        m.studentId === studentId &&
        m.examId === selectedExamId &&
        m.subjectId === subjectId,
    );
    return mark?.obtainedMarks ?? "";
  };

  const isAbsent = (studentId) => {
    const att = attendance.find(
      (a) => a.studentId === studentId && a.examId === selectedExamId,
    );
    return att?.isAbsent || false;
  };

  const handleSaveMarks = () => {
    saveExamMarks(marks);
    saveExamAttendance(attendance);
    setSavedMessage("Marks and attendance saved successfully!");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900">
          Enter Exam Marks
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div>
            <label className={labelClass}>Faculty</label>
            <select
              value={selectedFaculty}
              onChange={(e) => {
                setSelectedFaculty(e.target.value);
                setSelectedLevel("1");
              }}
              className={inputClass}
            >
              {FACULTY_CATALOG.map((fac) => (
                <option key={fac.code} value={fac.code}>
                  {fac.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {faculty?.structureType === "year" ? "Year" : "Semester"}
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className={inputClass}
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Batch</label>
            <input
              type="text"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className={inputClass}
              placeholder="e.g., 2086"
            />
          </div>

          <div>
            <label className={labelClass}>Exam</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className={inputClass}
            >
              {availableExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {savedMessage && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-700 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {savedMessage}
          </div>
        )}

        <div className="mb-6 rounded-lg bg-[var(--color-primary-bg)] p-4 text-sm text-[var(--color-primary-strong)]">
          <strong>Instructions:</strong> Enter marks for each student in each
          subject. Mark students as absent if they didn't take the exam. Marks
          showing "Abs" will override individual subject marks.
        </div>

        {classStudents.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
            No students found for selected batch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-24">
                    Roll No
                  </th>
                  {availableSubjects.map((subject) => (
                    <th
                      key={subject._id}
                      className="px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-24"
                    >
                      <div className="max-w-[120px] break-words text-xs">
                        {subject.name}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-20">
                    Absent?
                  </th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student) => (
                  <tr
                    key={student.studentId}
                    className={`border-b border-gray-200 ${
                      isAbsent(student.studentId) ? "bg-yellow-50" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.studentId}
                    </td>
                    {availableSubjects.map((subject) => (
                      <td key={subject._id} className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={getMark(student.studentId, subject._id)}
                          onChange={(e) =>
                            handleMarkChange(
                              student.studentId,
                              subject._id,
                              e.target.value,
                            )
                          }
                          disabled={isAbsent(student.studentId)}
                          className={`w-full px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                            isAbsent(student.studentId)
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : ""
                          }`}
                          placeholder="0-100"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleAbsenceToggle(student.studentId)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          isAbsent(student.studentId)
                            ? "bg-yellow-200 text-yellow-900"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {isAbsent(student.studentId) ? "Abs" : "—"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveMarks}
            className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-strong)] text-white font-semibold rounded-lg transition-colors"
          >
            Save Marks & Attendance
          </Button>
        </div>
      </div>
    </div>
  );
}
