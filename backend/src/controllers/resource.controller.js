import { Resource } from "../models/resource.model.js";
import mongoose from "mongoose";
import { ClassOffering } from "../models/classOffering.model.js";
import { Subject } from "../models/subject.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFilesToCloudinary } from "../utils/cloudinaryUpload.js";

const getPlainText = (value = "") =>
  String(value).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

const validateResourceContent = ({ type, title, description, images }) => {
  if (!['text', 'images'].includes(type)) {
    throw new ApiError(400, "Resource type must be text or images");
  }
  if (type === "text" && (!String(title || "").trim() || !getPlainText(description))) {
    throw new ApiError(400, "Text resources require both a title and description");
  }
  if (type === "images" && (!Array.isArray(images) || images.length === 0)) {
    throw new ApiError(400, "Image resources require at least one image");
  }
};

export const getResources = asyncHandler(async (req, res) => {
  // Students have read-only access to uploaded, active resources.
  const query = req.user?.role === "student" ? { isActive: true } : {};
  const resources = await Resource.find(query)
    .populate("subjectId", "subject_name subject_code")
    .sort({ createdAt: -1 });
  res
    .status(200)
    .json(new ApiResponse(200, resources, "Resources retrieved successfully"));
});

export const getTeacherResourceAssignments = asyncHandler(async (req, res) => {
  const offerings = await ClassOffering.find({
    teacherId: req.user._id,
    isActive: true,
  })
    .populate("facultyId", "faculty_code faculty_name structure max_level levels")
    .populate("subjectId", "subject_name subject_code level facultyId");

  const assignments = [];
  const seenSubjectIds = new Set();

  for (const offering of offerings) {
    const subject = offering.subjectId;
    const faculty = offering.facultyId;
    if (!subject || !faculty || seenSubjectIds.has(subject._id.toString())) continue;

    seenSubjectIds.add(subject._id.toString());
    assignments.push({
      subjectId: subject._id.toString(),
      subjectName: subject.subject_name,
      subjectCode: subject.subject_code || "",
      facultyId: faculty._id.toString(),
      facultyCode: faculty.faculty_code || "",
      facultyName: faculty.faculty_name || "",
      structureType: faculty.structure || "semester",
      level: subject.level,
    });
  }

  res
    .status(200)
    .json(new ApiResponse(200, assignments, "Teacher assignments retrieved successfully"));
});

export const createResource = asyncHandler(async (req, res) => {
  const {
    subjectId,
    title,
    description,
    type,
    imageMetadata = [],
  } = req.body;

  if (!subjectId) {
    throw new ApiError(400, "An assigned subject is required");
  }
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    throw new ApiError(400, "A valid subject is required");
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) throw new ApiError(404, "Subject not found");

  const isAssigned = await ClassOffering.exists({
    teacherId: req.user._id,
    subjectId: subject._id,
    facultyId: subject.facultyId,
    level: subject.level,
    isActive: true,
  });
  if (!isAssigned) {
    throw new ApiError(403, "You can only upload resources for subjects assigned to you");
  }

  const resourceType = type || "text";
  validateResourceContent({
    type: resourceType,
    title,
    description,
    images: imageMetadata,
  });

  const resource = new Resource({
    facultyId: subject.facultyId.toString(),
    level: subject.level,
    subjectId: subject._id,
    title: resourceType === "text" ? String(title).trim() : "",
    description: resourceType === "text" ? description || "" : "",
    type: resourceType,
    images: imageMetadata,
    isActive: true,
  });

  const saved = await resource.save();
  res
    .status(201)
    .json(new ApiResponse(201, saved, "Resource created successfully"));
});

export const uploadResourceImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No files uploaded");
  }

  const uploads = await uploadFilesToCloudinary(req.files, {
    folder: "resources",
  });
  res
    .status(200)
    .json(new ApiResponse(200, uploads, "Images uploaded to Cloudinary"));
});

export const updateResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { title, description, type, imageMetadata } = req.body;

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new ApiError(404, "Resource not found");
  }

  const nextType = type ?? resource.type;
  const nextTitle = title ?? resource.title;
  const nextDescription = description ?? resource.description;
  const nextImages = imageMetadata ?? resource.images;
  validateResourceContent({
    type: nextType,
    title: nextTitle,
    description: nextDescription,
    images: nextImages,
  });

  if (nextType === "images") {
    resource.title = "";
    resource.description = "";
  } else {
    if (title !== undefined) resource.title = title;
    if (description !== undefined) resource.description = description;
  }
  if (type !== undefined) resource.type = type;
  if (imageMetadata !== undefined) resource.images = imageMetadata;

  const updated = await resource.save();
  res
    .status(200)
    .json(new ApiResponse(200, updated, "Resource updated successfully"));
});

export const deleteResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const resource = await Resource.findByIdAndDelete(resourceId);
  if (!resource) {
    throw new ApiError(404, "Resource not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, resource, "Resource deleted successfully"));
});
