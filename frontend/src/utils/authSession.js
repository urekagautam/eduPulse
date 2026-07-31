const TOKEN_KEY = "examifyToken";
const USER_KEY = "examifyUser";
const EXPIRES_AT_KEY = "examifySessionExpiresAt";
const SESSION_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

// The server signs the access token with an `exp` claim. This is the source
// of truth for session expiry; the local timestamp is kept only for backwards
// compatibility with sessions stored before this helper was introduced.
const getTokenPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const getTokenExpiresAt = (token) => {
  const expiresAt = Number(getTokenPayload(token)?.exp) * 1000;
  return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : 0;
};

export const saveSession = ({ token, user }) => {
  const expiresAt = getTokenExpiresAt(token) || Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "{}");
  } catch {
    return {};
  }
};

export const getStoredSession = (requiredRole) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const payload = token ? getTokenPayload(token) : null;
  const tokenExpiresAt = token ? getTokenExpiresAt(token) : 0;
  const storedExpiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || 0);
  const storedUser = getStoredUser();
  const user = storedUser.role
    ? storedUser
    : payload?.role
      ? { role: String(payload.role).toLowerCase() }
      : {};
  const expiresAt = tokenExpiresAt || storedExpiresAt;

  if (!token || !expiresAt || Date.now() >= expiresAt) {
    clearSession();
    return null;
  }

  // Restore valid sessions created before `examifySessionExpiresAt` existed,
  // and keep the browser timestamp aligned to the actual JWT lifetime.
  if (tokenExpiresAt && storedExpiresAt !== tokenExpiresAt) {
    localStorage.setItem(EXPIRES_AT_KEY, String(tokenExpiresAt));
  }

  if (requiredRole && String(user.role).toLowerCase() !== requiredRole) {
    return null;
  }

  return { token, user, expiresAt };
};
