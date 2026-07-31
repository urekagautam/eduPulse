import express from "express";
import multer from "multer";
import {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  uploadNoticeImage,
} from "../controllers/notice.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Use memory storage so we can forward the buffer to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(verifyJWT);

// Students only receive published notices; administrators can retrieve all.
router.get("/", getNotices);

// Upload image for a notice (multipart/form-data, field name: `image`)
// This must be registered before `/:noticeId` so "upload" is not treated as an ID.
router.post("/upload", authorizeRoles("admin"), upload.single("image"), uploadNoticeImage);

// Get a single notice by ID
router.get("/:noticeId", getNoticeById);

// Create a new notice
router.post("/", authorizeRoles("admin"), createNotice);

// Update a notice
router.put("/:noticeId", authorizeRoles("admin"), updateNotice);

// Delete a notice
router.delete("/:noticeId", authorizeRoles("admin"), deleteNotice);

export default router;
