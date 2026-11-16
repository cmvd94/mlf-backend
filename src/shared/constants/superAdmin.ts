import { SuperAdmin } from "./adminRole";
import { generateObjectId } from "../utils/generateObjectId";

export const superAdminDetails = () => {
  const objectId = generateObjectId();
  return {
    _id: objectId,
    employeeId: "SA_01",
    name: "Vishnudas",
    email: "vishnudassonyz2@gmail.com",
    phoneNumber: "9626298790",
    role: SuperAdmin.SUPER_ADMIN,
    createdBy: objectId,
    updatedBy: objectId,
  };
};
