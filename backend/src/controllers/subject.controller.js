import mongoose from "mongoose";
import { ClassOffering } from "../models/classOffering.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Student } from "../models/student.model.js";
import { Subject } from "../models/subject.model.js";
import { Teacher } from "../models/teacher.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getLevelLabel = (faculty, level) =>
  faculty?.levels?.find((item) => item.value === Number(level))?.label ||
  `Level ${level}`;

const teacherFullName = (teacher) =>
  [teacher?.first_name, teacher?.middle_name, teacher?.last_name]
    .filter(Boolean)
    .join(" ");

const normalizeSubject = (subject, offerings = []) => {
  const faculty = subject.facultyId;
  const activeOfferings = offerings.filter((offering) => offering.subjectId?.toString() === subject._id.toString());
  const firstOffering = activeOfferings[0];
  const teacher = firstOffering?.teacherId;

  return {
    _id: subject._id,
    name: subject.subject_name,
    code: subject.subject_code || "",
    facultyId: faculty?._id?.toString() || subject.facultyId?.toString(),
    facultyCode: faculty?.faculty_code || "",
    facultyName: faculty?.faculty_name || "",
    level: subject.level,
    levelLabel: getLevelLabel(faculty, subject.level),
    assignedTeacher: teacher
      ? {
          teacherId: teacher._id?.toString(),
          fullName: teacherFullName(teacher),
          batches: activeOfferings.map((offering) => String(offering.batch)),
        }
      : null,
    createdAt: subject.createdAt,
    updatedAt: subject.updatedAt,
  };
};

export const getSubjects = async (req, res, next) => {
  try {
    const { facultyId, level, batch } = req.query;
    const filter = {};

    if (facultyId) {
      if (!mongoose.Types.ObjectId.isValid(facultyId)) {
        throw new ApiError(400, "Valid faculty is required");
      }
      filter.facultyId = new mongoose.Types.ObjectId(facultyId);
    }

    if (level) {
      filter.level = Number(level);
    }

    const subjects = await Subject.find(filter)
      .populate("facultyId")
      .sort({ createdAt: -1 });

    const subjectIds = subjects.map((subject) => subject._id);
    const offeringFilter = {
      subjectId: { $in: subjectIds },
      isActive: true,
    };
    if (batch) {
      offeringFilter.batch = Number(batch);
    }

    const offerings = subjectIds.length
      ? await ClassOffering.find(offeringFilter).populate("teacherId")
      : [];

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subjects.map((subject) => normalizeSubject(subject, offerings)),
          "Subjects retrieved successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req, res, next) => {
  try {
    const { name, code, facultyId, level } = req.body;

    if (!name?.trim() || !facultyId || !level) {
      throw new ApiError(400, "Subject name, faculty, and level are required");
    }

    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      throw new ApiError(400, "Valid faculty is required");
    }

    const faculty = await Faculty.findOne({
      _id: facultyId,
      isDeleted: { $ne: true },
    });
    if (!faculty) throw new ApiError(404, "Faculty not found");

    const subjectLevel = Number(level);
    if (subjectLevel < 1 || subjectLevel > faculty.max_level) {
      throw new ApiError(400, "Level is outside this faculty structure");
    }

    const subjectName = name.trim();
    const subjectCode = code?.trim() || "";

    const duplicate = await Subject.findOne({
      facultyId,
      level: subjectLevel,
      $or: [
        { subject_name: subjectName },
        ...(subjectCode ? [{ subject_code: subjectCode }] : []),
      ],
    });
    if (duplicate) {
      throw new ApiError(409, "Subject already exists for this class");
    }

    const subject = await Subject.create({
      subject_name: subjectName,
      subject_code: subjectCode,
      facultyId,
      level: subjectLevel,
    });

    const populated = await Subject.findById(subject._id)
      .populate("facultyId");
    res
      .status(201)
      .json(new ApiResponse(201, normalizeSubject(populated), "Subject created successfully"));
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { name, code } = req.body;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      throw new ApiError(400, "Valid subject is required");
    }
    if (!name?.trim()) {
      throw new ApiError(400, "Subject name is required");
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) throw new ApiError(404, "Subject not found");

    const subjectName = name.trim();
    const subjectCode = code?.trim() || "";
    const duplicate = await Subject.findOne({
      _id: { $ne: subject._id },
      facultyId: subject.facultyId,
      level: subject.level,
      $or: [
        { subject_name: subjectName },
        ...(subjectCode ? [{ subject_code: subjectCode }] : []),
      ],
    });
    if (duplicate) {
      throw new ApiError(409, "Subject already exists for this class");
    }

    subject.subject_name = subjectName;
    subject.subject_code = subjectCode;
    await subject.save();

    const populated = await Subject.findById(subject._id).populate("facultyId");
    res
      .status(200)
      .json(new ApiResponse(200, normalizeSubject(populated), "Subject updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      throw new ApiError(400, "Valid subject is required");
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) throw new ApiError(404, "Subject not found");

    const hasAssignments = await ClassOffering.exists({ subjectId: subject._id });
    if (hasAssignments) {
      throw new ApiError(
        409,
        "This subject has teacher assignments and cannot be deleted.",
      );
    }

    await subject.deleteOne();
    res.status(200).json(new ApiResponse(200, null, "Subject deleted successfully"));
  } catch (error) {
    next(error);
  }
};

export const assignSubjectTeacher = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { teacherId, batch } = req.body;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      throw new ApiError(400, "Valid subject is required");
    }
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      throw new ApiError(400, "Valid teacher is required");
    }

    const subject = await Subject.findById(subjectId).populate("facultyId");
    if (!subject) throw new ApiError(404, "Subject not found");

    const teacher = await Teacher.findOne({ _id: teacherId, isActive: true });
    if (!teacher) throw new ApiError(404, "Teacher not found");

    const assignmentBatch = Number(batch);
    if (!assignmentBatch) {
      throw new ApiError(400, "Batch is required for teacher assignment");
    }

    const activeStudentCount = await Student.countDocuments({
      facultyId: subject.facultyId._id,
      current_level: subject.level,
      admitted_batch: assignmentBatch,
      isActive: true,
      academic_status: { $ne: "graduated" },
    });

    if (!activeStudentCount) {
      throw new ApiError(400, "This batch is not active in the selected level");
    }

    await ClassOffering.findOneAndUpdate(
      {
        facultyId: subject.facultyId._id,
        level: subject.level,
        batch: assignmentBatch,
        subjectId: subject._id,
        isActive: true,
      },
      {
        $set: {
          teacherId,
          startDate: new Date(),
        },
        $setOnInsert: {
          facultyId: subject.facultyId._id,
          level: subject.level,
          batch: assignmentBatch,
          subjectId: subject._id,
          isActive: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const offerings = await ClassOffering.find({
      subjectId: subject._id,
      isActive: true,
      batch: assignmentBatch,
    }).populate("teacherId");

    const populatedSubject = await Subject.findById(subject._id)
      .populate("facultyId");

    res
      .status(200)
      .json(new ApiResponse(200, normalizeSubject(populatedSubject, offerings), "Teacher assigned successfully"));
  } catch (error) {
    next(error);
  }
};
