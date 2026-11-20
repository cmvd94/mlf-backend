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
  { partyCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
export class Party {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public partyCode!: string;

  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ type: String, trim: true, default: "" })
  public contactPerson?: string;

  @prop({ type: String, trim: true, default: "" })
  public phoneNumber?: string;

  @prop({ type: String, trim: true, default: "" })
  public email?: string;

  @prop({ type: String, trim: true, default: "" })
  public address?: string;

  @prop({ type: String, trim: true, default: "" })
  public gstin?: string;

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

export const PartyModel = getModelForClass(Party);
