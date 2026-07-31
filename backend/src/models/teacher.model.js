import mongoose, { Schema } from "mongoose";

const teacherSchema = new Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true,
    },

    middle_name: {
      type: String,
      trim: true,
      default: "",
    },

    last_name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile_no: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    plain_password: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Teacher = mongoose.model("Teacher", teacherSchema);
