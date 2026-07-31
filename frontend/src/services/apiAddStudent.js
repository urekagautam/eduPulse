const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const STUDENTS_API_URL = `${API_BASE_URL}/api/admin/students`;

const handleResponse = async (response) => {
  let result = null;
  try {
    result = await response.json();
  } catch (e) {
    result = null;
  }
  if (!response.ok) {
    throw new Error(result?.message || "Student API request failed");
  }
  return result ?? { success: true };
};

export const fetchStudents = async ({ facultyId, level, batch } = {}) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const url = new URL(STUDENTS_API_URL);
  if (facultyId) url.searchParams.append("facultyId", facultyId);
  if (level) url.searchParams.append("level", level);
  if (batch) url.searchParams.append("batch", batch);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });
  return handleResponse(response);
};

export const createStudent = async (studentData) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(STUDENTS_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(studentData),
  });
  return handleResponse(response);
};

export const updateStudent = async (studentId, studentData) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${STUDENTS_API_URL}/${studentId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(studentData),
  });
  return handleResponse(response);
};

export const deleteStudent = async (studentId) => {
  const token = localStorage.getItem("examifyToken");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${STUDENTS_API_URL}/${studentId}`, {
    method: "DELETE",
    headers,
  });
  return handleResponse(response);
};
