import { role } from "@/shared/constants/adminRole";

declare module "express-serve-static-core" {
  interface Request {
    admin?: {
      userId: string;
      name: string;
      role: role;
      deviceId: string;
    };
    rawBody?: string;
  }
}
