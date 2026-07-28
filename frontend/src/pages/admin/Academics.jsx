import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Users,
  GraduationCap,
  ArrowUpCircle,
  KeyRound,
  Plus,
  RefreshCw,
  BookOpen,
  Eye,
  EyeOff,
  Upload,
} from "lucide-react";
import Button from "../../components/Button";
import { createFaculty, fetchFaculties } from "../../services/apiFaculty";
import StudentProfile from "./academics/StudentProfile";
import BatchUpgradeTab from "./academics/BatchUpgradeTab";
import SubjectsTab from "./academics/SubjectsTab";
import {
  fetchStudents,
  createStudent as apiCreateStudent,
  updateStudent as apiUpdateStudent,
  deleteStudent as apiDeleteStudent,
  importStudents as apiImportStudents,
} from "../../services/apiAddStudent";
import TeacherProfile from "./academics/TeacherProfile";
import {
  fetchTeachers,
  createTeacher as apiCreateTeacher,
  updateTeacher as apiUpdateTeacher,
  deleteTeacher as apiDeleteTeacher,
} from "../../services/apiAddTeacher";

const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const SEMESTER_NAMES = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
];
const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

const MAX_SEMESTERS = 8;
const MAX_YEARS = 5;

function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
  const name = names[level - 1] || `Level ${level}`;
  return structureType === "semester" ? `${name} Semester` : `${name} Year`;
}

function getLevelOptions(faculty) {
  if (!faculty) return [];
  const limit =
    faculty.structureType === "semester" ? MAX_SEMESTERS : MAX_YEARS;
  const max = Math.min(Math.max(Number(faculty.maxLevel) || 1, 1), limit);
  return Array.from({ length: max }, (_, i) => {
    const level = i + 1;
    return { value: level, label: getLevelLabel(faculty.structureType, level) };
  });
}

function generatePassword() {
  return `Tmp@${Math.random().toString(36).slice(2, 10)}`;
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

// ─── Dummy data (MongoDB-style documents) ───────────────────────────────────

const initialFaculties = [
  {
    _id: "fac_bca",
    code: "BCA",
    name: "Bachelor of Computer Applications",
    structureType: "semester",
    maxLevel: 8,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "fac_bbm",
    code: "BBM",
    name: "Bachelor of Business Management",
    structureType: "semester",
    maxLevel: 8,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "fac_bbs",
    code: "BBS",
    name: "Bachelor of Business Studies",
    structureType: "year",
    maxLevel: 4,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "fac_bim",
    code: "BIM",
    name: "Bachelor of Information Management",
    structureType: "semester",
    maxLevel: 8,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    _id: "fac_bsc_csit",
    code: "BSC CSIT",
    name: "BSc Computer Science & Information Technology",
    structureType: "semester",
    maxLevel: 8,
    isSystemDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

const dummyStudents = [
  {
    _id: "stu_001",
    profile: {
      firstName: "Sita",
      middleName: "Kumari",
      lastName: "Shrestha",
      gender: "female",
      bloodGroup: "A+",
      email: "sita.shrestha@campus.edu.np",
      mobile: "9801111111",
      citizenshipNo: "12-34-567890",
    },
    studentId: "BCA-2081-001",
    universityRegNo: "REG-BCA-2081-001",
    universitySymbolNo: "SYM-001",
    guardian: {
      name: "Hari Shrestha",
      mobile: "9802222222",
      fatherName: "Hari Shrestha",
      motherName: "Gita Shrestha",
      fatherMobile: "9802222222",
      motherMobile: "9803333333",
    },
    admission: {
      facultyId: "fac_bca",
      facultyCode: "BCA",
      facultyName: "Bachelor of Computer Applications",
      batch: "2081",
    },
    enrollment: {
      status: "active",
      structureType: "semester",
      currentLevel: 3,
      currentLevelLabel: "Third Semester",
      currentClass: "BCA — Third Semester — Batch 2081",
    },
    graduation: null,
    credentials: {
      username: "sita.shrestha",
      hasPassword: true,
      lastResetAt: "2024-04-10T08:00:00.000Z",
    },
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2024-05-01T00:00:00.000Z",
  },
  {
    _id: "stu_002",
    profile: {
      firstName: "Rajesh",
      middleName: "",
      lastName: "Karki",
      gender: "male",
      bloodGroup: "B+",
      email: "rajesh.karki@campus.edu.np",
      mobile: "9804444444",
      citizenshipNo: null,
    },
    studentId: "BBS-2079-012",
    universityRegNo: "REG-BBS-2079-012",
    universitySymbolNo: "SYM-012",
    guardian: {
      name: "Prem Karki",
      mobile: "9805555555",
      fatherName: "Prem Karki",
      motherName: "Sunita Karki",
      fatherMobile: "9805555555",
      motherMobile: "9806666666",
    },
    admission: {
      facultyId: "fac_bbs",
      facultyCode: "BBS",
      facultyName: "Bachelor of Business Studies",
      batch: "2079",
    },
    enrollment: {
      status: "graduated",
      structureType: "year",
      currentLevel: null,
      currentLevelLabel: null,
      currentClass: null,
    },
    graduation: {
      facultyId: "fac_bbs",
      facultyCode: "BBS",
      facultyName: "Bachelor of Business Studies",
      batch: "2079",
      graduatedAt: "2024-03-15T00:00:00.000Z",
    },
    credentials: {
      username: "rajesh.karki",
      hasPassword: true,
      lastResetAt: null,
    },
    createdAt: "2020-08-01T00:00:00.000Z",
    updatedAt: "2024-03-15T00:00:00.000Z",
  },
];

const dummyTeachers = [
  {
    _id: "tch_001",
    profile: {
      firstName: "Anil",
      middleName: "Prasad",
      lastName: "Gurung",
      phone: "9811000001",
      email: "anil.gurung@campus.edu.np",
      address: "Kathmandu, Nepal",
    },
    credentials: {
      username: "anil.gurung",
      hasPassword: true,
      password: "",
      lastResetAt: "2024-04-01T00:00:00.000Z",
    },
    createdAt: "2023-06-01T00:00:00.000Z",
    updatedAt: "2024-04-01T00:00:00.000Z",
  },
  {
    _id: "tch_002",
    profile: {
      firstName: "Sunita",
      middleName: "",
      lastName: "Sharma",
      phone: "9811000002",
      email: "sunita.sharma@campus.edu.np",
      address: "Lalitpur, Nepal",
    },
    credentials: {
      username: "sunita.sharma",
      hasPassword: true,
      password: "",
      lastResetAt: "2024-03-20T00:00:00.000Z",
    },
    createdAt: "2023-08-01T00:00:00.000Z",
    updatedAt: "2024-03-20T00:00:00.000Z",
  },
  {
    _id: "tch_003",
    profile: {
      firstName: "Ramesh",
      middleName: "Kumar",
      lastName: "Adhikari",
      phone: "9811000003",
      email: "ramesh.adhikari@campus.edu.np",
      address: "Bhaktapur, Nepal",
    },
    credentials: {
      username: "ramesh.adhikari",
      hasPassword: true,
      password: "",
      lastResetAt: null,
    },
    createdAt: "2024-01-10T00:00:00.000Z",
    updatedAt: "2024-01-10T00:00:00.000Z",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function Academics() {
  const [faculties, setFaculties] = useState(initialFaculties);
  const [students, setStudents] = useState([]);
  const [activeStudentsForAssignments, setActiveStudentsForAssignments] =
    useState(
      dummyStudents.filter((student) => student.enrollment.status === "active"),
    );
  const [teachers, setTeachers] = useState(dummyTeachers);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("students");
  const [filterFacultyId, setFilterFacultyId] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterBatch, setFilterBatch] = useState("");

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [newStudentCreds, setNewStudentCreds] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [importingStudents, setImportingStudents] = useState(false);
  const [importNotice, setImportNotice] = useState(null);
  const studentImportInputRef = useRef(null);

  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [newTeacherCreds, setNewTeacherCreds] = useState(null);

  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const [newFacultyForm, setNewFacultyForm] = useState({
    code: "",
    name: "",
    structureType: "semester",
    maxLevel: 8,
  });

  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const response = await fetchFaculties();
        if (response?.success && Array.isArray(response.data)) {
          // Normalize id fields: prefer `_id`, fall back to `id`
          setFaculties(
            response.data.map((f) => ({ ...f, _id: f._id ?? f.id })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch faculties:", error);
      }
    };

    loadFaculties();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      if (!filterFacultyId || !filterLevel) {
        setStudents([]);
        return;
      }

      try {
        const response = await fetchStudents({
          facultyId: filterFacultyId,
          level: filterLevel,
        });
        if (response?.success && Array.isArray(response.data)) {
          setStudents(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };
    loadStudents();
  }, [filterFacultyId, filterLevel]);

  const loadActiveStudentsForAssignments = useCallback(async () => {
    try {
      const response = await fetchStudents();
      if (response?.success && Array.isArray(response.data)) {
        setActiveStudentsForAssignments(
          response.data.filter(
            (student) => student.enrollment?.status === "active",
          ),
        );
      }
    } catch (error) {
      console.error(
        "Failed to fetch active students for teacher assignments:",
        error,
      );
    }
  }, []);

  useEffect(() => {
    const fetchActiveAssignments = async () => {
      await loadActiveStudentsForAssignments();
    };
    fetchActiveAssignments();
  }, [loadActiveStudentsForAssignments]);

  const loadTeachers = useCallback(async () => {
    try {
      const response = await fetchTeachers();
      if (response?.success && Array.isArray(response.data)) {
        setTeachers(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    }
  }, []);

  useEffect(() => {
    const fetchTeacherList = async () => {
      await loadTeachers();
    };
    fetchTeacherList();
  }, [loadTeachers]);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [duplicateAlert, setDuplicateAlert] = useState(null);

  const filterFaculty = faculties.find((f) => f._id === filterFacultyId);
  const levelOptions = useMemo(
    () => getLevelOptions(filterFaculty),
    [filterFaculty],
  );
  const batchOptions = useMemo(() => {
    const batches = new Set();
    students.forEach((student) => {
      if (
        filterFacultyId &&
        filterLevel &&
        student.enrollment?.status === "active" &&
        student.admission?.facultyId === filterFacultyId &&
        String(student.enrollment?.currentLevel) === String(filterLevel) &&
        student.admission?.batch
      ) {
        batches.add(String(student.admission.batch));
      }
    });
    return Array.from(batches).sort((a, b) => Number(b) - Number(a));
  }, [students, filterFacultyId, filterLevel]);
  const selectedFilterBatch =
    filterBatch && batchOptions.includes(String(filterBatch))
      ? filterBatch
      : batchOptions[0] || "";

  const getTeacherAssignedSubjects = (teacher) => {
    return (teacher.assignedSubjects || []).map((subject) => ({
      ...subject,
      batches: subject.batch ? [String(subject.batch)] : subject.batches || [],
    }));
  };

  const assignmentBadgeClass = (status) =>
    status === "completed"
      ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800 border border-green-100"
      : "rounded-full bg-[var(--color-primary-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-strong)] border border-[var(--color-primary-border)]";

  const filteredStudents = students.filter((s) => {
    if (filterFacultyId && s.admission.facultyId !== filterFacultyId)
      return false;
    if (filterLevel) {
      if (s.enrollment.status === "graduated") return false;
      if (String(s.enrollment.currentLevel) !== filterLevel) return false;
    }
    if (
      selectedFilterBatch &&
      String(s.admission.batch) !== selectedFilterBatch
    )
      return false;
    return true;
  });

  const handleAddFaculty = async () => {
    if (!newFacultyForm.name.trim() || !newFacultyForm.code.trim()) return;

    const facultyName = newFacultyForm.name.trim();
    const facultyCode = newFacultyForm.code.trim().toUpperCase();

    // Check if a faculty with the same name already exists and is NOT deleted
    const existingFaculty = faculties.find(
      (f) => f.name.toLowerCase() === facultyName.toLowerCase() && !f.isDeleted,
    );

    if (existingFaculty) {
      // If faculty exists and is not deleted, show duplicate alert
      setDuplicateAlert({
        name: existingFaculty.name,
        code: existingFaculty.code,
      });
      return;
    }

    const payload = {
      code: facultyCode,
      name: facultyName,
      structureType: newFacultyForm.structureType,
      maxLevel: Number(newFacultyForm.maxLevel),
    };

    try {
      const result = await createFaculty(payload);
      if (result?.success && result.data) {
        const created = {
          ...result.data,
          _id: result.data._id ?? result.data.id,
        };
        setFaculties((current) => [...current, created]);
        setNewFacultyForm({
          code: "",
          name: "",
          structureType: "semester",
          maxLevel: 8,
        });
        setShowAddFaculty(false);
        setDuplicateAlert(null);
      }
    } catch (error) {
      console.error("Error adding faculty:", error);

      // Handle E11000 duplicate key error from backend
      if (
        error?.message?.includes("E11000") ||
        error?.message?.includes("duplicate")
      ) {
        setDuplicateAlert({
          name: facultyName,
          code: facultyCode,
        });
      } else {
        alert(error?.message || "Failed to add faculty. Please try again.");
      }
    }
  };

  const handleSaveStudent = async (payload) => {
    try {
      if (editingStudent) {
        const response = await apiUpdateStudent(editingStudent._id, payload);
        if (response?.success && response.data) {
          setStudents((current) =>
            current.map((s) =>
              s._id === editingStudent._id ? response.data : s,
            ),
          );
          setActiveStudentsForAssignments((current) =>
            current.map((s) =>
              s._id === editingStudent._id ? response.data : s,
            ),
          );
          setEditingStudent(null);
        }
      } else {
        const response = await apiCreateStudent(payload);
        if (response?.success && response.data) {
          setStudents((current) => [response.data, ...current]);
          setActiveStudentsForAssignments((current) => [
            response.data,
            ...current,
          ]);

          if (response.data.credentials?.password) {
            setNewStudentCreds({
              username: response.data.credentials.username,
              password: response.data.credentials.password,
            });
          }
        }
      }
      setShowAddStudent(false);
    } catch (error) {
      console.error("Failed to save student:", error);
      alert(error.message || "Failed to save student");
    }
  };

  const handleImportStudents = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingStudents(true);
    setImportNotice(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const studentsToImport = Array.isArray(parsed) ? parsed : parsed.students;
      if (!Array.isArray(studentsToImport) || studentsToImport.length === 0) {
        throw new Error("JSON must be an array or contain a students array.");
      }

      const response = await apiImportStudents(studentsToImport);
      const data = response?.data || {};
      setImportNotice({
        type: "success",
        message: `Imported ${data.createdCount || 0} student(s). Skipped ${data.skippedCount || 0}.`,
      });

      if (filterFacultyId && filterLevel) {
        const refreshed = await fetchStudents({
          facultyId: filterFacultyId,
          level: filterLevel,
        });
        if (refreshed?.success && Array.isArray(refreshed.data)) {
          setStudents(refreshed.data);
        }
      }
      await loadActiveStudentsForAssignments();
    } catch (error) {
      setImportNotice({
        type: "error",
        message: error.message || "Student import failed.",
      });
    } finally {
      setImportingStudents(false);
      event.target.value = "";
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student?"))
      return;
    try {
      const response = await apiDeleteStudent(studentId);
      if (response?.success) {
        setStudents((current) => current.filter((s) => s._id !== studentId));
        setActiveStudentsForAssignments((current) =>
          current.filter((s) => s._id !== studentId),
        );
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert(error.message || "Failed to delete student");
    }
  };

  const handleSaveTeacher = async (payload) => {
    try {
      if (editingTeacher) {
        const response = await apiUpdateTeacher(editingTeacher._id, payload);
        if (response?.success && response.data) {
          setTeachers((current) =>
            current.map((t) =>
              t._id === editingTeacher._id ? response.data : t,
            ),
          );
          setEditingTeacher(null);
        }
      } else {
        const response = await apiCreateTeacher(payload);
        if (response?.success && response.data) {
          setTeachers((current) => [response.data, ...current]);
          if (response.data.credentials?.password) {
            setNewTeacherCreds({
              username: response.data.credentials.username,
              password: response.data.credentials.password,
            });
          }
        }
      }
      setShowAddTeacher(false);
    } catch (error) {
      console.error("Failed to save teacher:", error);
      alert(error.message || "Failed to save teacher");
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm("Are you sure you want to delete this teacher?"))
      return;
    try {
      const response = await apiDeleteTeacher(teacherId);
      if (response?.success) {
        setTeachers((current) => current.filter((t) => t._id !== teacherId));
      }
    } catch (error) {
      console.error("Failed to delete teacher:", error);
      alert(error.message || "Failed to delete teacher");
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPasswordValue) return;
    const now = new Date().toISOString();
    try {
      if (resetTarget.type === "student") {
        await apiUpdateStudent(resetTarget.id, {
          password: resetPasswordValue,
        });
        setStudents(
          students.map((s) =>
            s._id === resetTarget.id
              ? {
                  ...s,
                  credentials: {
                    ...s.credentials,
                    lastResetAt: now,
                    hasPassword: true,
                  },
                  updatedAt: now,
                }
              : s,
          ),
        );
      } else {
        await apiUpdateTeacher(resetTarget.id, {
          password: resetPasswordValue,
        });
        setTeachers(
          teachers.map((t) =>
            t._id === resetTarget.id
              ? {
                  ...t,
                  credentials: {
                    ...t.credentials,
                    password: resetPasswordValue,
                    lastResetAt: now,
                    hasPassword: true,
                  },
                  updatedAt: now,
                }
              : t,
          ),
        );
      }
      setResetSuccess(true);
      setTimeout(() => {
        setResetTarget(null);
        setResetPasswordValue("");
        setResetSuccess(false);
      }, 2500);
    } catch (error) {
      console.error("Failed to reset password:", error);
      alert(error.message || "Failed to reset password");
    }
  };

  const tabs = [
    { id: "students", label: "Students", icon: Users },
    { id: "teachers", label: "Teachers", icon: GraduationCap },
    { id: "upgrade", label: "Batch Upgrade", icon: ArrowUpCircle },
    { id: "subjects", label: "Subjects", icon: BookOpen },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academics</h1>
          <p className="text-gray-600 mt-1">
            Manage faculties, students, teachers, subjects, and batch upgrades
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddFaculty(!showAddFaculty)}
        >
          <Plus className="w-4 h-4 inline mr-1" />
          {showAddFaculty ? "Close" : "Add Faculty"}
        </Button>
      </div>

      {/* Duplicate Faculty Alert */}
      {duplicateAlert && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-4">
          <div className="flex-shrink-0">
            <X className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-grow">
            <h3 className="font-semibold text-red-900">
              Faculty already added
            </h3>
            <p className="text-sm text-red-800 mt-1">
              A faculty named <strong>{duplicateAlert.name}</strong> (
              {duplicateAlert.code}) already exists. Please use a different
              name.
            </p>
          </div>
          <button
            onClick={() => setDuplicateAlert(null)}
            className="flex-shrink-0 text-red-600 hover:text-red-900"
            aria-label="Close alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Add faculty panel */}
      {showAddFaculty && (
        <div className="bg-white border-2 border-[var(--color-primary-border)] rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Add New Faculty</h2>
          <p className="text-sm text-gray-600">
            Enter faculty name first, then the faculty code. All fields are
            required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass} htmlFor="faculty-name">
                Faculty Name
              </label>
              <input
                id="faculty-name"
                type="text"
                className={inputClass}
                value={newFacultyForm.name}
                onChange={(e) =>
                  setNewFacultyForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Bachelor of Computer Applications"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="faculty-code">
                Faculty Code
              </label>
              <input
                id="faculty-code"
                type="text"
                className={inputClass}
                value={newFacultyForm.code}
                onChange={(e) =>
                  setNewFacultyForm((prev) => ({
                    ...prev,
                    code: e.target.value,
                  }))
                }
                placeholder="e.g. BCA"
              />
            </div>
            <Field label="Structure">
              <select
                className={selectClass}
                value={newFacultyForm.structureType}
                onChange={(e) =>
                  setNewFacultyForm((prev) => ({
                    ...prev,
                    structureType: e.target.value,
                    maxLevel: e.target.value === "semester" ? 8 : 5,
                  }))
                }
              >
                <option value="semester">Semester based</option>
                <option value="year">Year based</option>
              </select>
            </Field>
            <Field label="Max levels">
              <select
                className={selectClass}
                value={newFacultyForm.maxLevel}
                onChange={(e) =>
                  setNewFacultyForm((prev) => ({
                    ...prev,
                    maxLevel: Number(e.target.value),
                  }))
                }
              >
                {Array.from(
                  {
                    length:
                      newFacultyForm.structureType === "semester"
                        ? MAX_SEMESTERS
                        : MAX_YEARS,
                  },
                  (_, i) => i + 1,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}{" "}
                    {newFacultyForm.structureType === "semester"
                      ? "semesters"
                      : "years"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" type="button" onClick={handleAddFaculty}>
              Save Faculty
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Faculties overview
            </h2>
            <p className="text-sm text-gray-600">
              You can still add new faculties here, then manage all existing
              faculties on the dedicated page.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">
              {faculties.length} faculty{faculties.length === 1 ? "" : "ies"}
            </span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate("/admin/academics/faculties")}
            >
              See all faculty ›
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === id
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Students tab ─── */}
      {activeTab === "students" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-45">
              <label className={labelClass}>Faculty</label>
              <select
                className={selectClass}
                value={filterFacultyId}
                onChange={(e) => {
                  setFilterFacultyId(e.target.value);
                  setFilterLevel("");
                  setFilterBatch("");
                }}
              >
                <option value="">All faculties</option>
                {faculties.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.code} —{" "}
                    {f.structureType === "semester" ? "Semester" : "Year"} based
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-45">
              <label className={labelClass}>
                {filterFaculty?.structureType === "year" ? "Year" : "Semester"}
              </label>
              <select
                className={selectClass}
                value={filterLevel}
                onChange={(e) => {
                  setFilterLevel(e.target.value);
                  setFilterBatch("");
                }}
                disabled={!filterFacultyId}
              >
                <option value="">Select an option</option>
                {levelOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-45">
              <label className={labelClass}>Current batch</label>
              <input
                className={`${inputClass} bg-gray-50 text-gray-600`}
                value={
                  selectedFilterBatch
                    ? `Batch ${selectedFilterBatch}`
                    : "Auto selected"
                }
                readOnly
              />
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setEditingStudent(null);
                setShowAddStudent(true);
              }}
              disabled={!filterFacultyId || !filterLevel}
              title={
                !filterFacultyId || !filterLevel
                  ? "Select faculty and level/semester first"
                  : ""
              }
            >
              + Add Student
            </Button>
            <input
              ref={studentImportInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportStudents}
            />
            <Button
              variant="outline"
              onClick={() => studentImportInputRef.current?.click()}
              disabled={importingStudents}
            >
              <Upload className="w-4 h-4 inline mr-1 text-[var(--color-primary)]" />
              {importingStudents ? "Importing" : "Import JSON"}
            </Button>
          </div>

          {importNotice && (
            <p
              className={`rounded-lg px-4 py-3 text-sm ${
                importNotice.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-100"
                  : "bg-red-50 text-red-800 border border-red-100"
              }`}
            >
              {importNotice.message}
            </p>
          )}

          <StudentProfile
            isOpen={showAddStudent}
            onClose={() => {
              setShowAddStudent(false);
              setEditingStudent(null);
            }}
            onSave={handleSaveStudent}
            faculty={filterFaculty}
            currentLevel={filterLevel}
            student={editingStudent}
          />

          {newStudentCreds && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[var(--color-primary)]" />
                  Student Credentials Created
                </h2>
                <p className="text-sm text-gray-600">
                  The student has been saved successfully. Please copy the
                  temporary login credentials below:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">Username</span>
                    <p className="font-mono font-semibold text-gray-800">
                      {newStudentCreds.username}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">Password</span>
                    <p className="font-mono font-semibold text-gray-800">
                      {newStudentCreds.password}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setNewStudentCreds(null)}
                  >
                    Close & Copy Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Student list */}
          <div className="space-y-4">
            {!filterFacultyId || !filterLevel ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-600">
                  Please select the respective faculty and sem/year to view the
                  current batch.
                </p>
              </div>
            ) : !selectedFilterBatch ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-600">
                  No current active batch was found for this faculty and
                  sem/year.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-600">No students match this filter.</p>
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s._id}
                  className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
                >
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {s.profile.firstName} {s.profile.middleName}{" "}
                        {s.profile.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{s.studentId}</p>
                      {s.enrollment.status === "graduated" ? (
                        <span className="inline-block mt-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                          Graduated — {s.graduation.facultyCode} Batch{" "}
                          {s.graduation.batch}
                        </span>
                      ) : (
                        <span className="inline-block mt-2 rounded-full bg-[var(--color-primary-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-strong)]">
                          {s.enrollment.currentClass}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-600 space-y-2 flex flex-col items-end justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800">
                          <span className="text-xs font-normal text-gray-500 mr-1">
                            Username:
                          </span>
                          @{s.credentials?.username}
                        </p>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs font-normal text-gray-500">
                            Password:
                          </span>
                          <span className="font-mono font-semibold text-gray-800">
                            {visiblePasswords[s._id]
                              ? s.credentials?.password || "Not set"
                              : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePasswords((prev) => ({
                                ...prev,
                                [s._id]: !prev[s._id],
                              }))
                            }
                            className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                            title={
                              visiblePasswords[s._id]
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {visiblePasswords[s._id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          {s.profile?.mobile} · {s.profile?.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/admin/academics/students/${s._id}`)
                          }
                        >
                          <Eye className="w-3 h-3 inline mr-1 text-[var(--color-primary)]" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStudent(s);
                            setShowAddStudent(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteStudent(s._id)}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResetTarget({
                              type: "student",
                              id: s._id,
                              name: `${s.profile?.firstName} ${s.profile?.lastName}`,
                            });
                            setResetPasswordValue(generatePassword());
                            setResetSuccess(false);
                          }}
                        >
                          <RefreshCw className="w-3 h-3 inline mr-1 text-[var(--color-primary)]" />
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Teachers tab */}
      {activeTab === "teachers" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                setEditingTeacher(null);
                setShowAddTeacher(true);
              }}
            >
              + Add Teacher
            </Button>
          </div>

          <TeacherProfile
            isOpen={showAddTeacher}
            onClose={() => {
              setShowAddTeacher(false);
              setEditingTeacher(null);
            }}
            onSave={handleSaveTeacher}
            teacher={editingTeacher}
          />

          {newTeacherCreds && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[var(--color-primary)]" />
                  Teacher Credentials Created
                </h2>
                <p className="text-sm text-gray-600">
                  The teacher has been saved successfully. Please copy the
                  temporary login credentials below:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">Username</span>
                    <p className="font-mono font-semibold text-gray-800">
                      {newTeacherCreds.username}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border">
                    <span className="text-gray-500 text-xs">Password</span>
                    <p className="font-mono font-semibold text-gray-800">
                      {newTeacherCreds.password}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setNewTeacherCreds(null)}
                  >
                    Close & Copy Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {teachers.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-600">No teachers added yet.</p>
              </div>
            ) : (
              teachers.map((t) => {
                const assignedSubjects = getTeacherAssignedSubjects(t);
                return (
                  <div
                    key={t._id}
                    className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
                  >
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {t.profile.firstName} {t.profile.middleName}{" "}
                            {t.profile.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {t.profile.address || "Address not set"}
                          </p>
                        </div>

                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            other assigned subjects
                          </p>
                          {assignedSubjects.length === 0 ? (
                            <p className="text-sm text-gray-600">
                              No subject assignments.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {assignedSubjects.map((subject) => (
                                <span
                                  key={`${subject._id}-${subject.batches.join("-")}`}
                                  className={assignmentBadgeClass(
                                    subject.status,
                                  )}
                                >
                                  {subject.facultyCode} · {subject.levelLabel} ·{" "}
                                  {subject.name}
                                  {subject.batches.length > 0
                                    ? ` · Batch ${subject.batches.join(", ")}`
                                    : ""}
                                  {subject.statusLabel
                                    ? ` · ${subject.statusLabel}`
                                    : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right text-sm text-gray-600 space-y-2 flex flex-col items-end justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-800">
                            <span className="text-xs font-normal text-gray-500 mr-1">
                              Username:
                            </span>
                            @{t.credentials?.username || "not set"}
                          </p>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-xs font-normal text-gray-500">
                              Password:
                            </span>
                            <span className="font-mono font-semibold text-gray-800">
                              {visiblePasswords[t._id]
                                ? t.credentials?.password || "Not set"
                                : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  [t._id]: !prev[t._id],
                                }))
                              }
                              className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                              title={
                                visiblePasswords[t._id]
                                  ? "Hide password"
                                  : "Show password"
                              }
                            >
                              {visiblePasswords[t._id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">
                            {t.profile?.phone || "Phone not set"}
                            {t.profile?.email ? ` · ${t.profile.email}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTeacher(t);
                              setShowAddTeacher(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteTeacher(t._id)}
                          >
                            Delete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetTarget({
                                type: "teacher",
                                id: t._id,
                                name: `${t.profile.firstName} ${t.profile.lastName}`,
                              });
                              setResetPasswordValue(generatePassword());
                              setResetSuccess(false);
                            }}
                          >
                            <RefreshCw className="w-3 h-3 inline mr-1 text-[var(--color-primary)]" />
                            Reset
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {/* ─── Batch upgrade tab ─── */}
      {activeTab === "upgrade" && (
        <BatchUpgradeTab
          faculties={faculties}
          onComplete={() => {
            setStudents([]);
            setFilterLevel("");
            setFilterBatch("");
            loadActiveStudentsForAssignments();
          }}
        />
      )}

      {/* ─── Subjects tab ─── */}
      {activeTab === "subjects" && (
        <SubjectsTab
          faculties={faculties}
          teachers={teachers}
          activeStudentsForAssignments={activeStudentsForAssignments}
          onAssignmentsChange={loadTeachers}
        />
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                Reset password
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Set a new password for <strong>{resetTarget.name}</strong>
            </p>
            <Field label="New password">
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetPasswordValue(generatePassword())}
                >
                  Generate
                </Button>
              </div>
            </Field>
            {resetSuccess && (
              <p className="text-sm text-green-700 font-medium">
                Password reset recorded (UI demo).
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleResetPassword}>
                Confirm reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
