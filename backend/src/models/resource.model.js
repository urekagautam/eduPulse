import mongoose, { Schema } from "mongoose";

const resourceImageSchema = new Schema(
  {
    public_id: {
      type: String,
      required: true,
      trim: true,
    },
    secure_url: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    caption: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const resourceSchema = new Schema(
  {
    facultyId: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["text", "images"],
      default: "text",
    },
    images: {
      type: [resourceImageSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Resource = mongoose.model("Resource", resourceSchema);
