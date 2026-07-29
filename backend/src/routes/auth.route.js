import express from "express";
import { loginAdmin, changePassword } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/change-password", verifyJWT, changePassword);

export default router;
