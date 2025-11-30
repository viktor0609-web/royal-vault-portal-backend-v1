// Application constants

export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
};

export const WEBINAR_STATUS = {
  UPCOMING: "upcoming",
  LIVE: "live",
  ENDED: "ended",
  REPLAY: "replay",
};

export const WEBINAR_STREAM_TYPES = {
  LIVE: "live",
  REPLAY: "replay",
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

export const FIELD_SELECTION = {
  BASIC: "basic",
  DETAILED: "detailed",
  FULL: "full",
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export const ERROR_MESSAGES = {
  VALIDATION_ERROR: "Validation error",
  UNAUTHORIZED: "Unauthorized access",
  NOT_FOUND: "Resource not found",
  ALREADY_EXISTS: "Resource already exists",
  SERVER_ERROR: "Internal server error",
  INVALID_CREDENTIALS: "Invalid email or password",
  TOKEN_EXPIRED: "Token has expired",
  TOKEN_INVALID: "Invalid token",
};

