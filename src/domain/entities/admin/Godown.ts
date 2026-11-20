import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  Ref,
} from "@typegoose/typegoose";
import { Environment } from "@/shared/constants/environment";
import { Admin } from "./Admin";
import { Types } from "mongoose";

export enum GodownType {
  COMPANY_GODOWN = "company godown",
  JOBWORK_GODOWN = "jobwork godown",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== Environment.PRODUCTION,
  },
})
@index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
@index(
  { godownId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
@index({ pincode: 1 }, { partialFilterExpression: { isDeleted: false } })
export class Godown {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true })
  public godownId!: string;

  @prop({ required: true })
  public name!: string;

  @prop({ required: true, enum: Object.values(GodownType) })
  public type!: GodownType;

  @prop({ type: String, required: false, trim: true, default: "" })
  public description?: string;

  // Regional Scope / Location (similar used in admin)
  @prop({ required: true })
  public country!: string;

  @prop({ required: true })
  public zone!: string;

  @prop({ required: true })
  public state!: string;

  @prop({ required: true })
  public district!: string;

  @prop({ required: true })
  public pincode!: string;

  // Assigned Admins (all optional):
  // Godown Manager (single user)
  @prop({ ref: () => "Admin", required: false })
  public godownManagerId?: Ref<Admin>;

  // SUPERVISOR (array of users)
  @prop({ ref: () => "Admin", default: [] })
  public supervisorId!: Ref<Admin>[];

  // ASSISTANT (array of users)
  @prop({ ref: () => "Admin", default: [] })
  public assistantId!: Ref<Admin>[];

  // BILLING_USER (single user)
  @prop({ ref: () => "Admin", required: false })
  public billingUserId?: Ref<Admin>;

  @prop({ default: true })
  public isActive!: boolean;

  @prop({ default: false })
  public isDeleted!: boolean;

  @prop({ required: false })
  public deletedAt?: Date;

  @prop({ ref: () => "Admin", required: false })
  public deletedBy?: Ref<Admin>;

  @prop({ ref: () => "Admin", required: true })
  public createdBy!: Ref<Admin>;

  @prop({ ref: () => "Admin", required: false })
  public updatedBy?: Ref<Admin>;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const GodownModel = getModelForClass(Godown);
