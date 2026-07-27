import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Admin } from "../src/models/admin.model.js";
import { DB_NAME } from "../src/constants.js";

dotenv.config();

const run = async () => {
  try {
    const baseUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const uri = baseUri.includes(`/${DB_NAME}`)
      ? baseUri
      : `${baseUri}/${DB_NAME}`;
    await mongoose.connect(uri, { dbName: DB_NAME });
    console.log("Connected to", uri);

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@gmail.com";
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

    const admin = await Admin.findOne({ email: adminEmail }).lean();
    if (!admin) {
      console.log("No admin found with email", adminEmail);
      process.exit(0);
    }

    console.log("Admin found:");
    console.log("  id:", admin._id.toString());
    console.log("  email:", admin.email);

    const matchesDefault = await bcrypt.compare(
      defaultPassword,
      admin.password,
    );
    console.log(
      `Does default password ('${defaultPassword}') match current password?`,
      matchesDefault,
    );

    console.log("\nPassword hash (stored):", admin.password);
    console.log(
      "\nNote: passwords are stored hashed and cannot be recovered as plaintext.",
    );

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message || err);
    process.exit(1);
  }
};

run();
