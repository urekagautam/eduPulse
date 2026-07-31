import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Faculty } from "../models/faculty.model.js";
import { ClassOffering } from "../models/classOffering.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  buildUsernameBase,
  firstValidationError,
  getUniqueUsername,
  validateEmail,
  validateName,
  validateNepalMobile,
} from "../validations/person.validation.js";

// Helper to format/normalize flat Student mongoose model into nested frontend format
const normalizeStudent = (student) => {
  if (!student) return null;

  const faculty = student.facultyId;
  const facultyIdStr = faculty?._id ? faculty._id.toString() : student.facultyId?.toString() || "";
  const facultyCode = faculty?.faculty_code || faculty?.code || "";
  const facultyName = faculty?.faculty_name || faculty?.name || "";
  const structureType = faculty?.structure || faculty?.structureType || "semester";

  const SEMESTER_NAMES = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];
  const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

  const getLevelLabel = (struct, lvl) => {
    const names = struct === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
    const name = names[lvl - 1] || `Level ${lvl}`;
    return struct === "semester" ? `${name} Semester` : `${name} Year`;
  };

  const isGraduated = student.academic_status === "graduated";
  const levelLabel = !isGraduated && student.current_level ? getLevelLabel(structureType, student.current_level) : "";
  const currentClass = student.current_level
    ? `${facultyCode} — ${levelLabel} — Batch ${student.admitted_batch}`
    : "";

  return {
    _id: student._id,
    profile: {
      firstName: student.first_name,
      middleName: student.middle_name || "",
      lastName: student.last_name,
      gender: student.gender,
      bloodGroup: student.blood_group || "",
      email: student.email,
      mobile: student.mobile_no,
      citizenshipNo: student.citizenship_no || "",
    },
    studentId: student.std_id,
    universityRegNo: student.registration_no || "",
    universitySymbolNo: student.symbol_no || "",
    guardian: {
      name: student.guardian_name || "",
      mobile: student.guardian_mobile || "",
      fatherName: student.father_name || "",
      motherName: student.mother_name || "",
      fatherMobile: student.father_mobile || "",
      motherMobile: student.mother_mobile || "",
    },
    admission: {
      facultyId: facultyIdStr,
      facultyCode,
      facultyName,
      batch: String(student.admitted_batch),
    },
    enrollment: {
      status: isGraduated ? "graduated" : student.isActive ? "active" : "inactive",
      structureType,
      currentLevel: isGraduated ? null : student.current_level,
      currentLevelLabel: isGraduated ? null : levelLabel,
      currentClass: isGraduated ? null : currentClass,
    },
    graduation: isGraduated
      ? {
          facultyId: facultyIdStr,
          facultyCode,
          facultyName,
          batch: String(student.admitted_batch),
          graduatedAt: student.updatedAt || student.createdAt,
        }
      : null,
    academic_status: student.academic_status,
    isActive: student.isActive,
    credentials: {
      username: student.username,
      hasPassword: !!student.password,
      password: student.plain_password || "",
      lastResetAt: student.updatedAt || student.createdAt,
    },
    roll_no: student.roll_no,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
};

// Helper to parse either flat or nested request body properties
const parseStudentBody = (body) => {
  const profile = body.profile || {};
  const guardian = body.guardian || {};
  const admission = body.admission || {};
  const enrollment = body.enrollment || {};
  const credentials = body.credentials || {};

  return {
    std_id: body.studentId || body.std_id,
    first_name: profile.firstName || body.first_name || body.firstName,
    middle_name: profile.middleName || body.middle_name || body.middleName || "",
    last_name: profile.lastName || body.last_name || body.lastName,
    facultyId: admission.facultyId || body.facultyId,
    current_level: Number(enrollment.currentLevel || body.current_level || body.currentLevel),
    admitted_batch: Number(admission.batch || body.admitted_batch || body.admittedBatch),
    roll_no: Number(body.roll_no || body.rollNo || 0),
    mobile_no: profile.mobile || body.mobile_no || body.mobile || body.mobileNo,
    email: profile.email || body.email,
    gender: profile.gender || body.gender,
    blood_group: profile.bloodGroup || body.blood_group || body.bloodGroup || "",
    citizenship_no: profile.citizenshipNo || body.citizenship_no || body.citizenshipNo || "",
    registration_no: body.universityRegNo || body.registration_no || body.registrationNo || "",
    symbol_no: body.universitySymbolNo || body.symbol_no || body.symbolNo || "",
    guardian_name: guardian.name || body.guardian_name || body.guardianName || "",
    guardian_mobile: guardian.mobile || body.guardian_mobile || body.guardianMobile || "",
    father_name: guardian.fatherName || body.father_name || body.fatherName || "",
    father_mobile: guardian.fatherMobile || body.father_mobile || body.fatherMobile || "",
    mother_name: guardian.motherName || body.mother_name || body.motherName || "",
    mother_mobile: guardian.motherMobile || body.mother_mobile || body.motherMobile || "",
    username: credentials.username || body.username,
    password: credentials.password || body.password,
  };
};

const getNextRollNo = async (facultyId, admitted_batch) => {
  const maxStudent = await Student.findOne({ facultyId, admitted_batch })
    .sort({ roll_no: -1 })
    .select("roll_no");
  return maxStudent && maxStudent.roll_no ? maxStudent.roll_no + 1 : 1;
};

const validateStudentFields = (parsed) =>
  firstValidationError([
    validateName(parsed.first_name, "First name"),
    validateName(parsed.middle_name, "Middle name", { required: false }),
    validateName(parsed.last_name, "Last name"),
    validateEmail(parsed.email),
    validateNepalMobile(parsed.mobile_no, "Mobile number"),
    validateName(parsed.guardian_name, "Guardian name", { required: false }),
    validateNepalMobile(parsed.guardian_mobile, "Guardian mobile", {
      required: false,
    }),
    validateName(parsed.father_name, "Father's name", { required: false }),
    validateNepalMobile(parsed.father_mobile, "Father's mobile", {
      required: false,
    }),
    validateName(parsed.mother_name, "Mother's name", { required: false }),
    validateNepalMobile(parsed.mother_mobile, "Mother's mobile", {
      required: false,
    }),
  ]);

// Create Student
export const createStudent = async (req, res, next) => {
  try {
    const parsed = parseStudentBody(req.body);

    if (!parsed.std_id || !parsed.first_name || !parsed.last_name || !parsed.facultyId || !parsed.current_level || !parsed.admitted_batch || !parsed.email || !parsed.mobile_no || !parsed.gender) {
      throw new ApiError(400, "Required fields are missing");
    }

    const validationError = validateStudentFields(parsed);
    if (validationError) {
      throw new ApiError(400, validationError);
    }

    // Check if faculty exists
    const faculty = await Faculty.findById(parsed.facultyId);
    if (!faculty) {
      throw new ApiError(404, "Selected Faculty not found");
    }

    // Check unique email and std_id and username
    const existingStdId = await Student.findOne({ std_id: parsed.std_id });
    if (existingStdId) {
      throw new ApiError(409, "Student ID already exists");
    }

    const email = parsed.email.toLowerCase().trim();
    const mobile = parsed.mobile_no.trim();

    const [existingStudentEmail, existingTeacherEmail] = await Promise.all([
      Student.exists({ email }),
      Teacher.exists({ email }),
    ]);
    if (existingStudentEmail || existingTeacherEmail) {
      throw new ApiError(409, "Email already exists");
    }

    const [existingStudentMobile, existingTeacherMobile] = await Promise.all([
      Student.exists({ mobile_no: mobile }),
      Teacher.exists({ mobile_no: mobile }),
    ]);
    if (existingStudentMobile || existingTeacherMobile) {
      throw new ApiError(409, "Phone number already exists");
    }

    const finalUsername = await getUniqueUsername(
      Student,
      parsed.username || buildUsernameBase(parsed.first_name, parsed.last_name, parsed.std_id),
    );

    const tempPassword = parsed.password || `Tmp@${Math.random().toString(36).slice(2, 10)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Compute roll number if not provided or 0
    if (!parsed.roll_no) {
      parsed.roll_no = await getNextRollNo(parsed.facultyId, parsed.admitted_batch);
    }

    const student = await Student.create({
      ...parsed,
      email,
      mobile_no: mobile,
      username: finalUsername,
      password: hashedPassword,
      plain_password: tempPassword,
    });

    const populatedStudent = await Student.findById(student._id).populate("facultyId");
    
    // Return temp password in credentials if auto-generated/supplied to show in client UI
    const responseData = normalizeStudent(populatedStudent);
    if (responseData && responseData.credentials) {
      responseData.credentials.password = tempPassword;
    }

    res.status(201).json(new ApiResponse(201, responseData, "Student created successfully"));
  } catch (error) {
    next(error);
  }
};

// Get Students (with faculty/level filters)
// Get Students (with faculty/level filters)
export const getStudents = async (req, res, next) => {
  try {
    const { facultyId, level, batch } = req.query;
    const filter = { isActive: true, academic_status: { $ne: "graduated" } };

    if (facultyId) {
      // Convert string to MongoDB ObjectId
      filter.facultyId = new mongoose.Types.ObjectId(facultyId);
    }
    if (level) {
      filter.current_level = Number(level);
    }
    if (batch) {
      filter.admitted_batch = Number(batch);
    }

    const students = await Student.find(filter).populate("facultyId").sort({ createdAt: -1 });
    const formatted = students.map(normalizeStudent);

    res.status(200).json(new ApiResponse(200, formatted, "Students retrieved successfully"));
  } catch (error) {
    next(error);
  }
};

export const batchUpgradeStudents = async (req, res, next) => {
  try {
    const { facultyId, batch, fromLevel, toLevel, markAsGraduated } = req.body;

    if (!facultyId || !mongoose.Types.ObjectId.isValid(facultyId)) {
      throw new ApiError(400, "Valid faculty is required");
    }

    const admittedBatch = Number(batch);
    const sourceLevel = Number(fromLevel);

    if (!admittedBatch) {
      throw new ApiError(400, "Batch is required");
    }

    if (!sourceLevel) {
      throw new ApiError(400, "Current semester/year is required");
    }

    const faculty = await Faculty.findOne({
      _id: facultyId,
      isDeleted: { $ne: true },
    });

    if (!faculty) {
      throw new ApiError(404, "Faculty not found");
    }

    if (sourceLevel < 1 || sourceLevel > faculty.max_level) {
      throw new ApiError(400, "Current level is outside this faculty structure");
    }

    const latestOffering = await ClassOffering.findOne({
      facultyId: new mongoose.Types.ObjectId(facultyId),
      level: sourceLevel,
      isActive: true,
    })
      .sort({ batch: -1 })
      .select("batch");
    const latestActiveBatch = Number(latestOffering?.batch || 0);

    if (!latestActiveBatch || latestActiveBatch !== admittedBatch) {
      throw new ApiError(
        400,
        "Only the current active batch for this semester/year can be upgraded",
      );
    }

    const shouldGraduate = Boolean(markAsGraduated);
    const targetLevel = Number(toLevel) || sourceLevel + 1;

    if (!shouldGraduate) {
      if (targetLevel !== sourceLevel + 1) {
        throw new ApiError(400, "Students can only be upgraded to the next level");
      }

      if (targetLevel > faculty.max_level) {
        throw new ApiError(400, "Use graduate for students who completed the final level");
      }

      const occupiedHigherLevelCount = await Student.countDocuments({
        facultyId: new mongoose.Types.ObjectId(facultyId),
        admitted_batch: admittedBatch,
        current_level: targetLevel,
        isActive: true,
        academic_status: { $ne: "graduated" },
      });

      if (occupiedHigherLevelCount > 0) {
        const targetLabel =
          faculty.levels?.find((level) => level.value === targetLevel)?.label ||
          `Level ${targetLevel}`;
        throw new ApiError(
          409,
          `${targetLabel} already has active students. This higher semester/year should be upgraded first.`,
        );
      }
    }

    const filter = {
      facultyId: new mongoose.Types.ObjectId(facultyId),
      admitted_batch: admittedBatch,
      current_level: sourceLevel,
      isActive: true,
      academic_status: { $ne: "graduated" },
    };

    const matchingStudents = await Student.countDocuments(filter);

    if (!matchingStudents) {
      throw new ApiError(404, "No active students found for the selected batch and level");
    }

    const update = shouldGraduate
      ? { $set: { academic_status: "graduated", isActive: false } }
      : {
          $set: {
            current_level: targetLevel,
            academic_status: "active",
            isActive: true,
          },
        };

    const result = await Student.updateMany(filter, update);
    const updatedCount = result.modifiedCount ?? result.nModified ?? 0;

    await ClassOffering.updateMany(
      {
        facultyId: new mongoose.Types.ObjectId(facultyId),
        batch: admittedBatch,
        level: sourceLevel,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          endDate: new Date(),
        },
      },
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          updatedCount,
          facultyId,
          batch: admittedBatch,
          fromLevel: sourceLevel,
          toLevel: shouldGraduate ? null : targetLevel,
          academicStatus: shouldGraduate ? "graduated" : "active",
        },
        shouldGraduate
          ? "Batch marked as graduated successfully"
          : "Batch upgraded successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

// Update Student
export const updateStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    const parsed = parseStudentBody(req.body);

    const validationError = firstValidationError([
      parsed.first_name ? validateName(parsed.first_name, "First name") : "",
      parsed.middle_name !== undefined
        ? validateName(parsed.middle_name, "Middle name", { required: false })
        : "",
      parsed.last_name ? validateName(parsed.last_name, "Last name") : "",
      parsed.email ? validateEmail(parsed.email) : "",
      parsed.mobile_no ? validateNepalMobile(parsed.mobile_no, "Mobile number") : "",
      parsed.guardian_name !== undefined
        ? validateName(parsed.guardian_name, "Guardian name", { required: false })
        : "",
      parsed.guardian_mobile !== undefined
        ? validateNepalMobile(parsed.guardian_mobile, "Guardian mobile", {
            required: false,
          })
        : "",
      parsed.father_name !== undefined
        ? validateName(parsed.father_name, "Father's name", { required: false })
        : "",
      parsed.father_mobile !== undefined
        ? validateNepalMobile(parsed.father_mobile, "Father's mobile", {
            required: false,
          })
        : "",
      parsed.mother_name !== undefined
        ? validateName(parsed.mother_name, "Mother's name", { required: false })
        : "",
      parsed.mother_mobile !== undefined
        ? validateNepalMobile(parsed.mother_mobile, "Mother's mobile", {
            required: false,
          })
        : "",
    ]);
    if (validationError) {
      throw new ApiError(400, validationError);
    }

    // Update fields if provided
    if (parsed.std_id && parsed.std_id !== student.std_id) {
      const existing = await Student.findOne({ std_id: parsed.std_id });
      if (existing) throw new ApiError(409, "Student ID already exists");
      student.std_id = parsed.std_id;
    }

    if (parsed.email && parsed.email.toLowerCase().trim() !== student.email) {
      const email = parsed.email.toLowerCase().trim();
      const [existingStudent, existingTeacher] = await Promise.all([
        Student.exists({ _id: { $ne: student._id }, email }),
        Teacher.exists({ email }),
      ]);
      if (existingStudent || existingTeacher) {
        throw new ApiError(409, "Email already exists");
      }
      student.email = email;
    }

    if (parsed.mobile_no && parsed.mobile_no.trim() !== student.mobile_no) {
      const mobile = parsed.mobile_no.trim();
      const [existingStudent, existingTeacher] = await Promise.all([
        Student.exists({ _id: { $ne: student._id }, mobile_no: mobile }),
        Teacher.exists({ mobile_no: mobile }),
      ]);
      if (existingStudent || existingTeacher) {
        throw new ApiError(409, "Phone number already exists");
      }
      student.mobile_no = mobile;
    }

    if (parsed.first_name) student.first_name = parsed.first_name;
    if (parsed.middle_name !== undefined) student.middle_name = parsed.middle_name;
    if (parsed.last_name) student.last_name = parsed.last_name;
    if (parsed.facultyId) student.facultyId = parsed.facultyId;
    if (parsed.current_level) student.current_level = parsed.current_level;
    if (parsed.admitted_batch) student.admitted_batch = parsed.admitted_batch;
    if (parsed.roll_no) student.roll_no = parsed.roll_no;
    if (parsed.gender) student.gender = parsed.gender;
    if (parsed.blood_group !== undefined) student.blood_group = parsed.blood_group;
    if (parsed.citizenship_no !== undefined) student.citizenship_no = parsed.citizenship_no;
    if (parsed.registration_no !== undefined) student.registration_no = parsed.registration_no;
    if (parsed.symbol_no !== undefined) student.symbol_no = parsed.symbol_no;
    if (parsed.guardian_name !== undefined) student.guardian_name = parsed.guardian_name;
    if (parsed.guardian_mobile !== undefined) student.guardian_mobile = parsed.guardian_mobile;
    if (parsed.father_name !== undefined) student.father_name = parsed.father_name;
    if (parsed.father_mobile !== undefined) student.father_mobile = parsed.father_mobile;
    if (parsed.mother_name !== undefined) student.mother_name = parsed.mother_name;
    if (parsed.mother_mobile !== undefined) student.mother_mobile = parsed.mother_mobile;

    if (parsed.password) {
      student.password = await bcrypt.hash(parsed.password, 10);
      student.plain_password = parsed.password;
    }

    await student.save();
    
    const populatedStudent = await Student.findById(student._id).populate("facultyId");
    res.status(200).json(new ApiResponse(200, normalizeStudent(populatedStudent), "Student updated successfully"));
  } catch (error) {
    next(error);
  }
};

// Delete Student (Soft Delete)
export const deleteStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    student.isActive = false;
    await student.save();

    res.status(200).json(new ApiResponse(200, null, "Student deleted successfully"));
  } catch (error) {
    next(error);
  }
};
