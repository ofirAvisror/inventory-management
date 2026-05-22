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
