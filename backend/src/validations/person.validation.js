const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEPAL_MOBILE_PATTERN = /^(97|98)\d{8}$/;

export const normalizeText = (value) => String(value || "").trim();

export const validateName = (value, label, { required = true } = {}) => {
  const name = normalizeText(value);
  if (!name) return required ? `${label} is required` : "";
  if (!NAME_PATTERN.test(name)) {
    return `${label} cannot contain numbers or special symbols`;
  }
  return "";
};

export const validateEmail = (value) => {
  const email = normalizeText(value).toLowerCase();
  if (!email) return "Email is required";
  if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address";
  return "";
};

export const validateNepalMobile = (
  value,
  label = "Phone number",
  { required = true } = {},
) => {
  const mobile = normalizeText(value);
  if (!mobile) return required ? `${label} is required` : "";
  if (!NEPAL_MOBILE_PATTERN.test(mobile)) {
    return `${label} must be exactly 10 digits and start with 97 or 98`;
  }
  return "";
};

export const firstValidationError = (errors) => errors.find(Boolean) || "";

export const buildUsernameBase = (firstName, lastName, fallback = "user") => {
  const base = `${normalizeText(firstName)}.${normalizeText(lastName)}`
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return base || normalizeText(fallback).toLowerCase() || "user";
};

export const getUniqueUsername = async (Model, requestedBase) => {
  const base = normalizeText(requestedBase)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9.]+/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  const cleanBase = base || "user";

  let username = cleanBase;
  let suffix = 0;
  while (await Model.exists({ username })) {
    suffix += 1;
    username = `${cleanBase}${suffix}`;
  }
  return username;
};
