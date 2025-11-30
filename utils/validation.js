// Validation utilities

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    throw new Error(`${fieldName} is required`);
  }
  return true;
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }
  return true;
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    throw new Error("Invalid phone number format");
  }
  return true;
};

export const validateObjectId = (id, fieldName = "ID") => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  return true;
};

export const validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  if (pageNum < 1) {
    throw new Error("Page must be greater than 0");
  }
  if (limitNum < 1 || limitNum > 100) {
    throw new Error("Limit must be between 1 and 100");
  }

  return { page: pageNum, limit: limitNum };
};

export const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return input.trim();
  }
  return input;
};

