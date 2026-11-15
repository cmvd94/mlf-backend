import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  Ref,
} from "@typegoose/typegoose";
import { AdminRole, SuperAdmin } from "@/shared/constants/adminRole";
import { Environment } from "@/shared/constants/environment";
import { Language } from "@/shared/constants/locale";
import { Types } from "mongoose";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== Environment.PRODUCTION,
  },
})
@index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: SuperAdmin.SUPER_ADMIN } }
)
@index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
@index(
  { phoneNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
export class Admin {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true })
  name!: string;

  @prop({ required: true, unique: true })
  employeeId!: string;

  @prop({ required: true })
  email!: string;

  @prop({ required: true })
  phoneNumber!: string;

  @prop()
  password?: string;

  @prop({ default: true })
  isActive!: boolean;

  @prop({ required: true })
  role!: AdminRole | SuperAdmin;

  @prop({
    type: String,
    enum: Object.values(Language),
    required: false,
    default: Language.en,
  })
  language?: string;

  @prop({ ref: () => Admin, required: false })
  createdBy?: Ref<Admin>;

  @prop({ ref: () => Admin, required: false })
  updatedBy?: Ref<Admin>;

  @prop({ default: false })
  isDeleted!: boolean;

  @prop({ ref: () => Admin, required: false })
  deletedBy?: Ref<Admin>;

  @prop({ required: false })
  deletedAt?: Date;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const AdminModel = getModelForClass(Admin);
