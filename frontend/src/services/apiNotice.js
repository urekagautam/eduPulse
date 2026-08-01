import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const NOTICES_API_URL = `${API_BASE_URL}/api/notices`;

const authConfig = () => {
  const token = localStorage.getItem("examifyToken");
  if (import.meta.env.DEV) {
    console.debug(
      `[Notice API] Authorization header ${token ? "attached" : "missing"}`,
    );
  }
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// Get all notices
export const getNotices = async () => {
  try {
    const response = await axios.get(`${NOTICES_API_URL}`, authConfig());
    return response.data.data;
  } catch (error) {
    console.error("Error fetching notices:", error);
    throw error;
  }
};

// Get a single notice
export const getNoticeById = async (noticeId) => {
  try {
    const response = await axios.get(`${NOTICES_API_URL}/${noticeId}`, authConfig());
    return response.data.data;
  } catch (error) {
    console.error("Error fetching notice:", error);
    throw error;
  }
};

// Create a new notice
export const createNotice = async (noticeData) => {
  try {
    const response = await axios.post(`${NOTICES_API_URL}`, noticeData, authConfig());
    return response.data.data;
  } catch (error) {
    console.error("Error creating notice:", error);
    throw error;
  }
};

// Update a notice
export const updateNotice = async (noticeId, noticeData) => {
  try {
    const response = await axios.put(
      `${NOTICES_API_URL}/${noticeId}`,
      noticeData,
      authConfig(),
    );
    return response.data.data;
  } catch (error) {
    console.error("Error updating notice:", error);
    throw error;
  }
};

// Delete a notice
export const deleteNotice = async (noticeId) => {
  try {
    const response = await axios.delete(`${NOTICES_API_URL}/${noticeId}`, authConfig());
    return response.data.data;
  } catch (error) {
    console.error("Error deleting notice:", error);
    throw error;
  }
};
