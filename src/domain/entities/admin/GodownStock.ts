import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  Ref,
} from "@typegoose/typegoose";
import { Environment } from "@/shared/constants/environment";
import { Item } from "./Item";
import { Admin } from "./Admin";
import { Types } from "mongoose";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== Environment.PRODUCTION,
  },
})
@index({ godownId: 1, itemId: 1 }, { unique: true })
@index({ godownId: 1 })
@index({ itemId: 1 })
export class GodownStock {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ ref: () => "Godown", required: true })
  public godownId!: Ref<any>;

  @prop({ ref: () => Item, required: true })
  public itemId!: Ref<Item>;

  @prop({ required: true, default: 0 })
  public currentStock!: number;

  @prop({ ref: () => "Admin", required: false })
  public updatedBy?: Ref<Admin>;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const GodownStockModel = getModelForClass(GodownStock);
