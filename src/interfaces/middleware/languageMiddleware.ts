import { Request, Response, NextFunction } from "express";
import i18n from "@/config/i18n";
import { AdminModel } from "@/domain/entities/admin/Admin";

const resolveUserLanguage = async (req: Request): Promise<string | null> => {
  const userId = req.admin?.userId;
  if (!userId) return null;
  const user = await AdminModel.findById(userId);
  return user?.language ?? null;
};

export const setLanguage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let locale = "en";

    const explicitLanguage =
      req.body?.language || (req.headers["accept-language"] as string);

    if (explicitLanguage && i18n.getLocales().includes(explicitLanguage)) {
      locale = explicitLanguage;
    } else {
      const userLanguage = await resolveUserLanguage(req);
      if (userLanguage) {
        locale = userLanguage;
      }
    }
    i18n.setLocale(req, locale);
    next();
  } catch (error) {
    next(error);
  }
};
