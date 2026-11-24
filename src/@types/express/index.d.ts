import { role } from "@/shared/constants/adminRole";
import { AccessScope } from "@/shared/utils/validateLocationAdminNewUser";

declare module "express-serve-static-core" {
  interface Request {
    admin?: {
      userId: string;
      name: string;
      role: role;
      deviceId: string;
      accessScope?: AccessScope;
      godownId?: string[];
    };
    rawBody?: string;
  }
}

