import { SuperAdmin } from "./adminRole";
import { generateObjectId } from "../utils/generateObjectId";

export const superAdminDetails = () => {
  const objectId = generateObjectId();
  return {
    _id: objectId,
    employeeId: "SA_01",
    name: "MLF Super Admin",
    email: "admin@mlf.com",
    phoneNumber: "9876543210",
    role: SuperAdmin.SUPER_ADMIN,
    accessScope: {},
    createdBy: objectId,
    updatedBy: objectId,
  };
};
