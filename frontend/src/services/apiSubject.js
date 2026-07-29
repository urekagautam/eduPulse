const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const SUBJECTS_API_URL = `${API_BASE_URL}/api/admin/subjects`;

const getHeaders = () => {
  const token = localStorage.getItem("examifyToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  let result = null;
  try {
    result = await response.json();
  } catch (e) {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.message || "Subject API request failed");
  }

  return result ?? { success: true };
};

export const fetchSubjects = async ({ facultyId, level, batch } = {}) => {
  const url = new URL(SUBJECTS_API_URL);
  if (facultyId) url.searchParams.append("facultyId", facultyId);
  if (level) url.searchParams.append("level", level);
  if (batch) url.searchParams.append("batch", batch);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const createSubject = async (subject) => {
  const response = await fetch(SUBJECTS_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(subject),
  });
  return handleResponse(response);
};

export const updateSubject = async (subjectId, subject) => {
  const response = await fetch(`${SUBJECTS_API_URL}/${subjectId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(subject),
  });
  return handleResponse(response);
};

export const deleteSubject = async (subjectId) => {
  const response = await fetch(`${SUBJECTS_API_URL}/${subjectId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const assignSubjectTeacher = async (subjectId, teacherId, batch) => {
  const response = await fetch(`${SUBJECTS_API_URL}/${subjectId}/teacher`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ teacherId, batch }),
  });
  return handleResponse(response);
};
