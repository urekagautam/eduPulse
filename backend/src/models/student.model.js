import mongoose, { Schema } from "mongoose";

const studentSchema = new Schema(
  {
    std_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

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

    facultyId: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },

    current_level: {
      type: Number,
      required: true,
    },

    admitted_batch: {
      type: Number,
      required: true,
    },
    academic_status: {
      type: String,
      enum: ["active", "graduated"],
      default: "active",
    },

    roll_no: {
      type: Number,
      required: true,
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

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },

    blood_group: {
      type: String,
      trim: true,
    },

    citizenship_no: {
      type: String,
      trim: true,
    },

    registration_no: {
      type: String,
      trim: true,
    },

    symbol_no: {
      type: String,
      trim: true,
    },

    guardian_name: {
      type: String,
      trim: true,
    },

    guardian_mobile: {
      type: String,
      trim: true,
    },

    father_name: {
      type: String,
      trim: true,
    },

    father_mobile: {
      type: String,
      trim: true,
    },

    mother_name: {
      type: String,
      trim: true,
    },

    mother_mobile: {
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

    performance_summary: {
      cumulative_gpa: {
        type: Number,
        default: null,
      },
      term_count: {
        type: Number,
        default: 0,
      },
      last_exam_id: {
        type: Schema.Types.ObjectId,
        ref: "Exam",
      },
      updated_at: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  },
);

export const Student = mongoose.model("Student", studentSchema);
