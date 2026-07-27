import express from "express";
import multer from "multer";
import {
  getResources,
  createResource,
  uploadResourceImages,
  updateResource,
  deleteResource,
} from "../controllers/resource.controller.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", getResources);
router.post("/", createResource);
router.post("/upload", upload.array("images"), uploadResourceImages);
router.put("/:resourceId", updateResource);
router.delete("/:resourceId", deleteResource);

export default router;
