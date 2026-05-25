import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, infer as ZodInfer } from "zod";

export function validateBody<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (
    req: Request<unknown, unknown, ZodInfer<TSchema>>,
    _res: Response,
    next: NextFunction
  ): void => {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  };
}

export function validateQuery<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req.query);
    (req as Request & { validatedQuery: ZodInfer<TSchema> }).validatedQuery =
      parsed;
    next();
  };
}

export function validateParams<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req.params);
    (req as Request & { validatedParams: ZodInfer<TSchema> }).validatedParams =
      parsed;
    next();
  };
}

export function getValidatedQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}

export function getValidatedParams<T>(req: Request): T {
  return (req as Request & { validatedParams: T }).validatedParams;
}
