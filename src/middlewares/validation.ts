import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ErrorCodes } from '../constants/errorCodes';

/**
 * Validation middleware factory
 * Creates a middleware that validates request body against a DTO class
 *
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export function validateDto<T extends object>(
  dtoClass: new () => T
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Transform plain object to class instance
    const dtoInstance = plainToInstance(dtoClass, req.body);

    // Validate the instance
    const errors: ValidationError[] = await validate(dtoInstance, {
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      skipMissingProperties: false, // Don't skip validation of missing properties
    });

    if (errors.length > 0) {
      // Log validation details server-side only; never send to client
      const formattedErrors = formatValidationErrors(errors);
      console.warn('Validation failed:', { errors: formattedErrors, path: req.path });

      res.badRequest(ErrorCodes.VALIDATION_ERROR.message, ErrorCodes.VALIDATION_ERROR.code);
      return;
    }

    // Attach validated DTO to request for use in route handler
    req.body = dtoInstance;
    next();
  };
}

/**
 * Formats validation errors into a readable array of strings
 */
function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    // Handle nested validation errors
    if (error.children && error.children.length > 0) {
      messages.push(...formatValidationErrors(error.children));
    }
  }

  return messages;
}
