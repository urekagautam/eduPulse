import express from "express";
import {
  assignSubjectTeacher,
  createSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
} from "../controllers/subject.controller.js";

const router = express.Router();

router.get("/", getSubjects);
router.post("/", createSubject);
router.put("/:subjectId", updateSubject);
router.delete("/:subjectId", deleteSubject);
router.put("/:subjectId/teacher", assignSubjectTeacher);

export default router;
