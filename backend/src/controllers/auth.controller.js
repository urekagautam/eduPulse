import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "examify_secret";

export const loginAdmin = async (req, res, next) => {
  try {
    const { email, username, identifier, password, role = "admin" } = req.body;
    const loginRole = ["admin", "teacher", "student"].includes(role)
      ? role
      : "admin";
    const loginId = (identifier || email || username || "").trim();

    if (!loginId || !password) {
      throw new ApiError(400, "Username/email and password are required");
    }

    let user = null;
    let invalidMessage = "Invalid username or password";

    if (loginRole === "admin") {
      user = await Admin.findOne({ email: loginId.toLowerCase() });
      invalidMessage = "Invalid email or password";
    } else if (loginRole === "teacher") {
      user = await Teacher.findOne({
        username: loginId.toLowerCase(),
        isActive: true,
      });
    } else {
      user = await Student.findOne({
        username: loginId.toLowerCase(),
        isActive: true,
        academic_status: { $ne: "graduated" },
      });
    }

    if (!user) throw new ApiError(401, invalidMessage);

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new ApiError(401, invalidMessage);
    }

    const token = jwt.sign(
      { id: user._id, role: loginRole },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: "3d",
      },
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          token,
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            name:
              loginRole === "admin"
                ? user.email
                : [user.first_name, user.middle_name, user.last_name]
                    .filter(Boolean)
                    .join(" "),
            role: loginRole,
          },
        },
        "Login successful",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Current and new password are required");
    }

    if (newPassword.length < 8) {
      throw new ApiError(400, "New password must be at least 8 characters");
    }

    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    // find user across possible collections
    let user =
      (await Admin.findById(userId)) ||
      (await Teacher.findById(userId)) ||
      (await Student.findById(userId));

    if (!user) throw new ApiError(404, "User not found");

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) throw new ApiError(401, "Current password is incorrect");

    if (await bcrypt.compare(newPassword, user.password)) {
      throw new ApiError(
        400,
        "New password must be different from current password",
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Password updated successfully"));
  } catch (error) {
    next(error);
  }
};
