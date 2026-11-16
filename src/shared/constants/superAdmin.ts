import { SuperAdmin } from "./adminRole";
import { generateObjectId } from "../utils/generateObjectId";
import bcrypt from "bcryptjs";

export const superAdminDetails = async () => {
  const objectId = generateObjectId();
  const hashedPassword = await bcrypt.hash("mlf@123", 10);
  return {
    _id: objectId,
    employeeId: "mlf_01",
    name: "Vishnudas",
    email: "vishnudassonyz2@gmail.com",
    phoneNumber: "9626298790",
    password: hashedPassword,
    role: SuperAdmin.SUPER_ADMIN,
    createdBy: objectId,
    updatedBy: objectId,
  };
};
