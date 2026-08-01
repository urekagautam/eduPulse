import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Upload notice image using multipart/form-data to the backend upload endpoint.
 * @param {File} file
 * @returns {Promise<{ imagePath: string }>}
 */
export async function uploadNoticeImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const token = localStorage.getItem("examifyToken");

  const res = await axios.post(`${API_BASE_URL}/api/notices/upload`, formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // response: { status, data: { imagePath: 'https://...' } }
  return res.data.data;
}
