import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  Ref,
} from "@typegoose/typegoose";
import { Environment } from "@/shared/constants/environment";
import { Admin } from "./Admin";
import { UnitOfMeasurement } from "./UnitOfMeasurement";
import { PerUnit } from "./PerUnit";
import { ItemGroup } from "./ItemGroup";
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
  { itemCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
export class Item {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public itemCode!: string;

  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ type: String, trim: true, default: "" })
  public description?: string;

  @prop({ ref: () => ItemGroup, required: false })
  public itemGroupId?: Ref<ItemGroup>;

  @prop({ ref: () => UnitOfMeasurement, required: true })
  public defaultUomId!: Ref<UnitOfMeasurement>;

  @prop({ ref: () => PerUnit, required: true })
  public defaultPerId!: Ref<PerUnit>;

  @prop({ default: 0 })
  public standardRate!: number;

  @prop({ default: 0 })
  public currentStock!: number; // Reflects stock value updated by purchases

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

export const ItemModel = getModelForClass(Item);
