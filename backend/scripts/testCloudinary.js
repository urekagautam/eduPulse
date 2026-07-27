import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const run = async () => {
  try {
    const data = fs.readFileSync("./test-image.jpg");
    const dataUri = `data:image/jpeg;base64,${data.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "notices_test",
    });
    console.log("Upload success", result && result.secure_url);
  } catch (err) {
    console.error(
      "Cloudinary upload failed:",
      err && err.message ? err.message : err,
    );
  }
};

run();
