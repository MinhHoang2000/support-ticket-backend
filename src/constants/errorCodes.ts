/**
 * Internal error codes with general user-facing messages.
 * Used in API responses instead of stack traces or internal details.
 */
export const ErrorCodes = {
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again later.',
    statusCode: 500,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
    statusCode: 404,
  },
  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    message: 'The request is invalid.',
    statusCode: 400,
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed. Please check your input.',
    statusCode: 400,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication is required to access this resource.',
    statusCode: 401,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action.',
    statusCode: 403,
  },
  CONFLICT: {
    code: 'CONFLICT',
    message: 'The request could not be completed due to a conflict.',
    statusCode: 409,
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'The service is temporarily unavailable. Please try again later.',
    statusCode: 503,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'A database error occurred. Please try again later.',
    statusCode: 500,
  },
  AI_ERROR: {
    code: 'AI_ERROR',
    message: 'The AI service encountered an error. Please try again later.',
    statusCode: 502,
  },
  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: 'An external service is temporarily unavailable. Please try again later.',
    statusCode: 502,
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please try again later.',
    statusCode: 429,
  },
  CONFIGURATION_ERROR: {
    code: 'CONFIGURATION_ERROR',
    message: 'A configuration error occurred. Please contact support.',
    statusCode: 500,
  },
} as const;

export type ErrorCodeName = keyof typeof ErrorCodes;
