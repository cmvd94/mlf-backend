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
import { UnitOfMeasurement } from "./UnitOfMeasurement";
import { PerUnit } from "./PerUnit";
import { Types } from "mongoose";

export enum StockSourceType {
  PURCHASE = "PURCHASE",
  TRANSFER = "TRANSFER",
  MANUAL = "MANUAL",
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== Environment.PRODUCTION,
  },
})
@index({ companyGodownId: 1 })
@index({ companyGodownId: 1, itemId: 1 })
@index({ godownId: 1, itemId: 1 })
@index({ godownId: 1, itemId: 1, batchNo: 1 })
@index({ godownId: 1, currentStock: 1 })
@index({ purchaseId: 1 })
@index({ stockTransferId: 1 })
export class GodownStock {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ ref: () => "Godown", required: true })
  public godownId!: Ref<any>;

  @prop({ ref: () => "Godown", required: true })
  public companyGodownId!: Ref<any>;

  @prop({ ref: () => Item, required: true })
  public itemId!: Ref<Item>;

  @prop({ type: String, trim: true, default: "" })
  public batchNo!: string;

  @prop({ required: true, default: 0 })
  public currentStock!: number;

  @prop({ required: false, default: 0 })
  public initialStock?: number;

  @prop({ required: false, default: 0 })
  public rate?: number;

  @prop({ ref: () => UnitOfMeasurement, required: false })
  public uomId?: Ref<UnitOfMeasurement>;

  @prop({ required: false, default: 1 })
  public uomQuantity?: number;

  @prop({ ref: () => PerUnit, required: false })
  public perId?: Ref<PerUnit>;

  @prop({ ref: () => "Purchase", required: false })
  public purchaseId?: Ref<any>;

  @prop({ required: false })
  public purchaseItemId?: Types.ObjectId;

  @prop({ ref: () => "StockTransfer", required: false })
  public stockTransferId?: Ref<any>;

  @prop({ type: String, enum: Object.values(StockSourceType), default: StockSourceType.PURCHASE })
  public sourceType!: StockSourceType;

  @prop({ default: true })
  public isActive!: boolean;

  @prop({ default: false })
  public isDeleted!: boolean;

  @prop({ ref: () => "Admin", required: false })
  public createdBy?: Ref<Admin>;

  @prop({ ref: () => "Admin", required: false })
  public updatedBy?: Ref<Admin>;

  public createdAt!: Date;
  public updatedAt!: Date;
}

export const GodownStockModel = getModelForClass(GodownStock);
