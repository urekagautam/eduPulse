import bcrypt from "bcryptjs";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
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

const normalizeTeacher = (teacher, assignedSubjects = []) => ({
  _id: teacher._id,
  profile: {
    firstName: teacher.first_name,
    middleName: teacher.middle_name || "",
    lastName: teacher.last_name,
    phone: teacher.mobile_no,
    email: teacher.email,
    address: teacher.address || "",
  },
  credentials: {
    username: teacher.username,
    hasPassword: !!teacher.password,
    password: teacher.plain_password || "",
    lastResetAt: teacher.updatedAt || teacher.createdAt,
  },
  assignedSubjects,
  createdAt: teacher.createdAt,
  updatedAt: teacher.updatedAt,
});

const parseTeacherBody = (body) => {
  const profile = body.profile || {};
  const credentials = body.credentials || {};

  return {
    first_name: profile.firstName || body.first_name || body.firstName,
    middle_name: profile.middleName || body.middle_name || body.middleName || "",
    last_name: profile.lastName || body.last_name || body.lastName,
    mobile_no: profile.phone || body.mobile_no || body.mobile || body.phone,
    email: profile.email || body.email,
    address: profile.address || body.address || "",
    username: credentials.username || body.username,
    password: credentials.password || body.password,
  };
};

const getActiveAssignedSubjectsByTeacher = async (teacherIds) => {
  if (!teacherIds.length) return new Map();

  const offerings = await ClassOffering.find({
    teacherId: { $in: teacherIds },
  })
    .populate("facultyId")
    .populate("subjectId")
    .sort({ createdAt: -1 });

  const activeBatchMap = new Map();
  const latestActiveBatchMap = new Map();
  const activeOfferings = await ClassOffering.find({ isActive: true }).select(
    "facultyId level batch",
  );
  activeOfferings.forEach((offering) => {
    const key = `${offering.facultyId?.toString()}-${offering.level}`;
    const batches = activeBatchMap.get(key) || new Set();
    const batch = Number(offering.batch);
    batches.add(String(batch));
    activeBatchMap.set(key, batches);

    const latestBatch = latestActiveBatchMap.get(key) || 0;
    if (batch > latestBatch) {
      latestActiveBatchMap.set(key, batch);
    }
  });

  const map = new Map();
  offerings.forEach((offering) => {
    const faculty = offering.facultyId;
    const subject = offering.subjectId;
    if (!faculty || !subject) return;

    const activeBatches = activeBatchMap.get(
      `${faculty._id.toString()}-${offering.level}`,
    );
    const latestActiveBatch = latestActiveBatchMap.get(
      `${faculty._id.toString()}-${offering.level}`,
    );
    const isCurrentBatch =
      offering.isActive &&
      activeBatches?.has(String(offering.batch)) &&
      Number(offering.batch) === Number(latestActiveBatch);

    const teacherId = offering.teacherId.toString();
    const current = map.get(teacherId) || [];
    current.push({
      _id: offering._id,
      subjectId: subject._id,
      name: subject.subject_name,
      code: subject.subject_code || "",
      facultyId: faculty._id,
      facultyCode: faculty.faculty_code,
      facultyName: faculty.faculty_name,
      level: offering.level,
      levelLabel:
        faculty.levels?.find((level) => level.value === offering.level)?.label ||
        `Level ${offering.level}`,
      batch: String(offering.batch),
      status: isCurrentBatch ? "current" : "completed",
      statusLabel: isCurrentBatch ? "Current" : "Completed",
    });
    map.set(teacherId, current);
  });

  return map;
};

const validateTeacherFields = (parsed) =>
  firstValidationError([
    validateName(parsed.first_name, "First name"),
    validateName(parsed.middle_name, "Middle name", { required: false }),
    validateName(parsed.last_name, "Last name"),
    validateEmail(parsed.email),
    validateNepalMobile(parsed.mobile_no, "Phone number"),
  ]);

export const getTeachers = async (req, res, next) => {
  try {
    const teachers = await Teacher.find({ isActive: true }).sort({
      createdAt: -1,
    });
    const assignmentMap = await getActiveAssignedSubjectsByTeacher(
      teachers.map((teacher) => teacher._id),
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          teachers.map((teacher) =>
            normalizeTeacher(teacher, assignmentMap.get(teacher._id.toString()) || []),
          ),
          "Teachers retrieved successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const createTeacher = async (req, res, next) => {
  try {
    const parsed = parseTeacherBody(req.body);

    if (
      !parsed.first_name ||
      !parsed.last_name ||
      !parsed.mobile_no ||
      !parsed.email
    ) {
      throw new ApiError(400, "Required fields are missing");
    }

    const validationError = validateTeacherFields(parsed);
    if (validationError) {
      throw new ApiError(400, validationError);
    }

    const email = parsed.email.toLowerCase().trim();
    const mobile = parsed.mobile_no.trim();
    const [existingTeacherEmail, existingStudentEmail] = await Promise.all([
      Teacher.exists({ email }),
      Student.exists({ email }),
    ]);
    if (existingTeacherEmail || existingStudentEmail) {
      throw new ApiError(409, "Email already exists");
    }

    const [existingTeacherMobile, existingStudentMobile] = await Promise.all([
      Teacher.exists({ mobile_no: mobile }),
      Student.exists({ mobile_no: mobile }),
    ]);
    if (existingTeacherMobile || existingStudentMobile) {
      throw new ApiError(409, "Phone number already exists");
    }

    const username = await getUniqueUsername(
      Teacher,
      parsed.username || buildUsernameBase(parsed.first_name, parsed.last_name, "teacher"),
    );

    const tempPassword =
      parsed.password || `Tmp@${Math.random().toString(36).slice(2, 10)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const teacher = await Teacher.create({
      ...parsed,
      email,
      mobile_no: mobile,
      username,
      password: hashedPassword,
      plain_password: tempPassword,
    });

    const responseData = normalizeTeacher(teacher);
    responseData.credentials.password = tempPassword;

    res
      .status(201)
      .json(new ApiResponse(201, responseData, "Teacher created successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new ApiError(404, "Teacher not found");

    const parsed = parseTeacherBody(req.body);

    const validationError = firstValidationError([
      parsed.first_name ? validateName(parsed.first_name, "First name") : "",
      parsed.middle_name !== undefined
        ? validateName(parsed.middle_name, "Middle name", { required: false })
        : "",
      parsed.last_name ? validateName(parsed.last_name, "Last name") : "",
      parsed.email ? validateEmail(parsed.email) : "",
      parsed.mobile_no ? validateNepalMobile(parsed.mobile_no, "Phone number") : "",
    ]);
    if (validationError) {
      throw new ApiError(400, validationError);
    }

    if (parsed.email && parsed.email.toLowerCase().trim() !== teacher.email) {
      const email = parsed.email.toLowerCase().trim();
      const [existingTeacher, existingStudent] = await Promise.all([
        Teacher.exists({ _id: { $ne: teacher._id }, email }),
        Student.exists({ email }),
      ]);
      if (existingTeacher || existingStudent) {
        throw new ApiError(409, "Email already exists");
      }
      teacher.email = email;
    }

    if (parsed.mobile_no && parsed.mobile_no.trim() !== teacher.mobile_no) {
      const mobile = parsed.mobile_no.trim();
      const [existingTeacher, existingStudent] = await Promise.all([
        Teacher.exists({ _id: { $ne: teacher._id }, mobile_no: mobile }),
        Student.exists({ mobile_no: mobile }),
      ]);
      if (existingTeacher || existingStudent) {
        throw new ApiError(409, "Phone number already exists");
      }
      teacher.mobile_no = mobile;
    }

    if (parsed.first_name) teacher.first_name = parsed.first_name;
    if (parsed.middle_name !== undefined) teacher.middle_name = parsed.middle_name;
    if (parsed.last_name) teacher.last_name = parsed.last_name;
    if (parsed.address !== undefined) teacher.address = parsed.address;

    if (parsed.password) {
      teacher.password = await bcrypt.hash(parsed.password, 10);
      teacher.plain_password = parsed.password;
    }

    await teacher.save();

    const assignmentMap = await getActiveAssignedSubjectsByTeacher([teacher._id]);
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          normalizeTeacher(teacher, assignmentMap.get(teacher._id.toString()) || []),
          "Teacher updated successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const deleteTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) throw new ApiError(404, "Teacher not found");

    teacher.isActive = false;
    await teacher.save();

    res.status(200).json(new ApiResponse(200, null, "Teacher deleted successfully"));
  } catch (error) {
    next(error);
  }
};
