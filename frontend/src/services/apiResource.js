import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const RESOURCES_API_URL = `${API_BASE_URL}/api/resources`;

export const getResources = async () => {
  try {
    const response = await axios.get(RESOURCES_API_URL);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching resources:", error);
    throw error;
  }
};

export const createResource = async (resourceData) => {
  try {
    const response = await axios.post(RESOURCES_API_URL, resourceData);
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
    );
    return response.data.data;
  } catch (error) {
    console.error("Error updating resource:", error);
    throw error;
  }
};

export const deleteResource = async (resourceId) => {
  try {
    const response = await axios.delete(`${RESOURCES_API_URL}/${resourceId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
};
