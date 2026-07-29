import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function uploadResourceImages(files, onUploadProgress) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const res = await axios.post(
    `${API_BASE_URL}/api/resources/upload`,
    formData,
    {
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onUploadProgress(percentage);
        }
      },
    },
  );

  return res.data.data;
}
