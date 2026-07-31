import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const RESOURCES_API_URL = `${API_BASE_URL}/api/resources`;

const authConfig = () => {
  const token = localStorage.getItem("examifyToken");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const getResources = async () => {
  try {
    const response = await axios.get(RESOURCES_API_URL, authConfig());
    return response.data.data;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const getTeacherResourceAssignments = async () => {
  try {
    const response = await axios.get(
      `${RESOURCES_API_URL}/assignments`,
      authConfig(),
    );
    return response.data.data;
  } catch (error) {
    console.error("Error fetching teacher resource assignments:", error);
    throw error;
  }
};

export const createResource = async (resourceData) => {
  try {
    const response = await axios.post(RESOURCES_API_URL, resourceData, authConfig());
    return response.data.data;
  } catch (error) {
    console.error("Error creating resource:", error);
    throw error;
  }
};

export const updateResource = async (resourceId, resourceData) => {
  try {
    const response = await axios.put(
      `${RESOURCES_API_URL}/${resourceId}`,
      resourceData,
      authConfig(),
    );
    return response.data.data;
  } catch (error) {
    console.error("Error updating resource:", error);
    throw error;
  }
};

export const deleteResource = async (resourceId) => {
  try {
    const response = await axios.delete(`${RESOURCES_API_URL}/${resourceId}`, authConfig());
    return response.data.data;
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
};
