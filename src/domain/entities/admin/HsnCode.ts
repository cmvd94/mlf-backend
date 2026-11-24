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
  { hsnCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
export class HsnCode {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public hsnCode!: string;

  @prop({ type: String, trim: true, default: "" })
  public description?: string;

  @prop({ default: 5 })
  public gstRate!: number;

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

export const HsnCodeModel = getModelForClass(HsnCode);
