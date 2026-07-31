const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEPAL_MOBILE_PATTERN = /^(97|98)\d{8}$/;

export function validateName(value, label, { required = true } = {}) {
  const name = String(value || "").trim();
  if (!name) return required ? `${label} is required.` : "";
  if (!NAME_PATTERN.test(name)) {
    return `${label} cannot contain numbers or special symbols.`;
  }
  return "";
}

export function validateEmail(value) {
  const email = String(value || "").trim();
  if (!email) return "Email is required.";
  if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address.";
  return "";
}

export function validateNepalMobile(value, label = "Phone number", { required = true } = {}) {
  const mobile = String(value || "").trim();
  if (!mobile) return required ? `${label} is required.` : "";
  if (!/^\d+$/.test(mobile) || mobile.length !== 10) {
    return `${label} must contain 10 digits.`;
  }
  if (!NEPAL_MOBILE_PATTERN.test(mobile)) return "Invalid phone number.";
  return "";
}

export function firstValidationError(errors) {
  return errors.find(Boolean) || "";
}
