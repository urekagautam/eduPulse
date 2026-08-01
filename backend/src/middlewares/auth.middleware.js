import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Admin } from "../models/admin.model.js";

export const verifyJWT = async (req, res, next) => {
  const requestLabel = `${req.method} ${req.originalUrl}`;
  const token =
    req.header("Authorization")?.replace("Bearer ", "") ||
    req.cookies?.accessToken;

  if (!token) {
    console.warn(`[auth] ${requestLabel}: rejected because no JWT was provided`);
    throw new ApiError(401, "No token provided");
  }

  let decoded;
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET || "examify_secret";
    decoded = jwt.verify(token, secret);
  } catch (err) {
    console.warn(`[auth] ${requestLabel}: rejected because the JWT is invalid or expired`);
    throw new ApiError(401, "Invalid or expired token");
  }

  let user = await Student.findById(decoded.id);
  let resolvedRole = user ? "student" : "";

  if (!user) {
    user = await Teacher.findById(decoded.id);
    resolvedRole = user ? "teacher" : "";
  }
  if (!user) {
    user = await Admin.findById(decoded.id);
    resolvedRole = user ? "admin" : "";
  }

  if (!user) {
    console.warn(`[auth] ${requestLabel}: rejected because JWT user ${decoded.id} was not found`);
    throw new ApiError(401, "User not found");
  }

  const tokenRole = String(decoded.role || "").toLowerCase();
  if (tokenRole && tokenRole !== resolvedRole) {
    console.warn(
      `[auth] ${requestLabel}: JWT role "${tokenRole}" does not match verified user role "${resolvedRole}"; using verified role`,
    );
  }

  // The database collection that contains the verified user is authoritative.
  // A stale JWT role claim must never downgrade a valid administrator to 403.
  req.user = { _id: user._id, role: resolvedRole };
  console.info(`[auth] ${requestLabel}: authenticated user ${user._id} as ${resolvedRole}`);
  next();
};

export const authorizeRoles = (...roles) => (req, res, next) => {
  const actualRole = String(req.user?.role || "").toLowerCase();
  const allowedRoles = roles.map((role) => role.toLowerCase());

  if (!allowedRoles.includes(actualRole)) {
    console.warn(
      `[auth] ${req.method} ${req.originalUrl}: authorization denied for role "${actualRole || "unknown"}"; required: ${allowedRoles.join(", ")}`,
    );
    throw new ApiError(403, "You are not authorized to perform this action");
  }
  console.info(
    `[auth] ${req.method} ${req.originalUrl}: authorization granted for role "${actualRole}"`,
  );
  next();
};
