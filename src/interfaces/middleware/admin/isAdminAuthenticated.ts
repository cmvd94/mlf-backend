import { Request, Response, NextFunction } from "express";
import { authenticateTokenAdmin } from "./adminAuthMiddleware";

export async function isAdminAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await authenticateTokenAdmin(req, res, (err: any) => {
    if (err) return next(err);
    next();
  });
}
