import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AUTH_ERROR_CODES, type AuthErrorCode } from "../types/auth.js";

export class HttpError extends Error {
  status: number;
  code: AuthErrorCode | string;
  details?: unknown;

  constructor(
    status: number,
    code: AuthErrorCode | string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json({ code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      code: AUTH_ERROR_CODES.VALIDATION_ERROR,
      message: "Invalid request payload",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err);
  res.status(500).json({
    code: AUTH_ERROR_CODES.INTERNAL,
    message: "Internal server error",
  });
}
