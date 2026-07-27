import { Resource } from "../models/resource.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFilesToCloudinary } from "../utils/cloudinaryUpload.js";

export const getResources = asyncHandler(async (req, res) => {
  const resources = await Resource.find().sort({ createdAt: -1 });
  res
    .status(200)
    .json(new ApiResponse(200, resources, "Resources retrieved successfully"));
});

export const createResource = asyncHandler(async (req, res) => {
  const {
    facultyId,
    level,
    title,
    description,
    type,
    imageMetadata = [],
  } = req.body;

  if (!facultyId || !level) {
    throw new ApiError(400, "Faculty and level are required");
  }

  const resource = new Resource({
    facultyId,
    level,
    title: title || "",
    description: description || "",
    type: type || "text",
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

  if (title !== undefined) resource.title = title;
  if (description !== undefined) resource.description = description;
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
