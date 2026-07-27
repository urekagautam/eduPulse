import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/ApiError.js";

const getCloudinaryConfig = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new ApiError(500, "Cloudinary configuration is missing");
  }
  return {
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  };
};

const configureCloudinary = () => {
  const config = getCloudinaryConfig();
  cloudinary.config(config);
  return cloudinary;
};

export const uploadFilesToCloudinary = async (files, options = {}) => {
  const cloud = configureCloudinary();
  const uploaded = [];

  for (const file of files) {
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const result = await new Promise((resolve, reject) => {
      const stream = cloud.uploader.upload_stream(
        options,
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(uploadResult);
        },
      );
      stream.end(file.buffer);
    });

    uploaded.push({
      public_id: result.public_id,
      secure_url: result.secure_url,
      bytes: result.bytes,
      format: result.format,
      original_filename: result.original_filename,
    });
  }

  return uploaded;
};
