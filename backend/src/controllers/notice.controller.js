import { Notice } from "../models/notice.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v2 as cloudinary } from "cloudinary";

// Get all notices
const getNotices = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  // Published notices are the only notices visible to students.
  const query = req.user?.role === "student" ? { isActive: true } : {};
  if (req.user?.role !== "student" && isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  const notices = await Notice.find(query).sort({ createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, notices, "Notices retrieved successfully"));
});

// Get a single notice by ID
const getNoticeById = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;

  const notice = await Notice.findById(noticeId);

  if (!notice) {
    throw new ApiError(404, "Notice not found");
  }

  if (req.user?.role === "student" && !notice.isActive) {
    throw new ApiError(404, "Notice not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, notice, "Notice retrieved successfully"));
});

// Create a new notice
const createNotice = asyncHandler(async (req, res) => {
  console.info(
    `[notice] POST /api/notices reached by ${req.user?._id} (${req.user?.role})`,
  );
  const {
    title,
    description,
    font_style = {},
    notice_image = "",
    image_caption = "",
    isActive = true,
  } = req.body;

  // Validate input
  if (!title && !description && !notice_image) {
    throw new ApiError(
      400,
      "At least one of title, description, or notice_image is required",
    );
  }

  const notice = new Notice({
    title: title || "",
    description: description || "",
    font_style: {
      bold: font_style.bold || false,
      italic: font_style.italic || false,
      underline: font_style.underline || false,
    },
    notice_image,
    image_caption,
    isActive,
  });

  const savedNotice = await notice.save();

  res
    .status(201)
    .json(new ApiResponse(201, savedNotice, "Notice created successfully"));
});

// Update a notice
const updateNotice = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;
  const {
    title,
    description,
    font_style,
    notice_image,
    image_caption,
    isActive,
  } = req.body;

  const notice = await Notice.findById(noticeId);

  if (!notice) {
    throw new ApiError(404, "Notice not found");
  }

  // Update fields if provided
  if (title !== undefined) notice.title = title;
  if (description !== undefined) notice.description = description;
  if (font_style !== undefined) {
    notice.font_style = {
      bold: font_style.bold ?? notice.font_style.bold,
      italic: font_style.italic ?? notice.font_style.italic,
      underline: font_style.underline ?? notice.font_style.underline,
    };
  }
  if (notice_image !== undefined) notice.notice_image = notice_image;
  if (image_caption !== undefined) notice.image_caption = image_caption;
  if (isActive !== undefined) notice.isActive = isActive;

  const updatedNotice = await notice.save();

  res
    .status(200)
    .json(new ApiResponse(200, updatedNotice, "Notice updated successfully"));
});

// Delete a notice
const deleteNotice = asyncHandler(async (req, res) => {
  const { noticeId } = req.params;

  const notice = await Notice.findByIdAndDelete(noticeId);

  if (!notice) {
    throw new ApiError(404, "Notice not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, notice, "Notice deleted successfully"));
});

// Upload notice image to Cloudinary (falls back to direct Base64 only when Cloudinary is not configured)
const uploadNoticeImage = asyncHandler(async (req, res) => {
  try {
    console.log("[uploadNoticeImage] incoming request");
    console.log(
      "[uploadNoticeImage] env CLOUDINARY_CLOUD_NAME:",
      process.env.CLOUDINARY_CLOUD_NAME ? "SET" : "(not set)",
    );
    console.log(
      "[uploadNoticeImage] env CLOUDINARY_API_KEY:",
      process.env.CLOUDINARY_API_KEY ? "SET" : "(not set)",
    );
    console.log(
      "[uploadNoticeImage] env CLOUDINARY_API_SECRET:",
      process.env.CLOUDINARY_API_SECRET ? "SET" : "(not set)",
    );

    if (!req.file) {
      console.error("[uploadNoticeImage] req.file is undefined");
      throw new ApiError(400, "No file uploaded");
    }

    console.log("[uploadNoticeImage] req.file:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname,
    });

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const hasCloudinaryConfig =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (!hasCloudinaryConfig) {
      console.warn(
        "[uploadNoticeImage] Cloudinary not fully configured — using Base64 fallback",
      );
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { imagePath: dataUri },
            "Image uploaded to DB (Base64 fallback)",
          ),
        );
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "notices" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      stream.end(req.file.buffer);
    });

    console.log("[uploadNoticeImage] cloudinary result:", {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      bytes: uploadResult.bytes,
      format: uploadResult.format,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { imagePath: uploadResult.secure_url },
          "Image uploaded to Cloudinary",
        ),
      );
  } catch (err) {
    console.error(
      "[uploadNoticeImage] error:",
      err && err.stack ? err.stack : err,
    );
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      throw new ApiError(500, "Failed to upload image to Cloudinary");
    }
    throw err;
  }
});

export {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  uploadNoticeImage,
};
