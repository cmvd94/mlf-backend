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
  { symbol: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
@index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
export class UnitOfMeasurement {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true, trim: true, uppercase: true })
  public symbol!: string;

  @prop({ type: String, trim: true, default: "" })
  public description?: string;

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

export const UnitOfMeasurementModel = getModelForClass(UnitOfMeasurement);
