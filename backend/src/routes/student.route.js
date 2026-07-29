import express from "express";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  batchUpgradeStudents,
} from "../controllers/student.controller.js";

const router = express.Router();

router.get("/", getStudents);
router.post("/", createStudent);
router.post("/batch-upgrade", batchUpgradeStudents);
router.put("/:studentId", updateStudent);
router.delete("/:studentId", deleteStudent);

export default router;
