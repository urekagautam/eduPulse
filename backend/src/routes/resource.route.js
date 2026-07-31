import express from "express";
import multer from "multer";
import {
  getResources,
  getTeacherResourceAssignments,
  createResource,
  uploadResourceImages,
  updateResource,
  deleteResource,
} from "../controllers/resource.controller.js";
import { authorizeRoles, verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(verifyJWT);

router.get("/", getResources);
router.get("/assignments", authorizeRoles("teacher"), getTeacherResourceAssignments);
router.post("/", authorizeRoles("teacher"), createResource);
router.post("/upload", authorizeRoles("teacher"), upload.array("images"), uploadResourceImages);
router.put("/:resourceId", authorizeRoles("teacher"), updateResource);
router.delete("/:resourceId", authorizeRoles("teacher"), deleteResource);

export default router;
