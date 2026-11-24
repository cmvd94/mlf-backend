import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  Ref,
} from "@typegoose/typegoose";
import { Environment } from "@/shared/constants/environment";
import { Admin } from "./Admin";
import { Party } from "./Party";
import { SalesType } from "./SalesType";
import { Item } from "./Item";
import { UnitOfMeasurement } from "./UnitOfMeasurement";
import { PerUnit } from "./PerUnit";
import { GodownStock } from "./GodownStock";
import { Types } from "mongoose";

export class SaleItem {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ ref: () => "GodownStock", required: true })
  public godownStockId!: Ref<any>;

  @prop({ ref: () => Item, required: true })
  public itemId!: Ref<Item>;

  @prop({ ref: () => "Godown", required: true })
  public godownId!: Ref<any>;

  @prop({ ref: () => "Godown", required: false })
  public companyGodownId?: Ref<any>;

  @prop({ type: String, trim: true, default: "" })
  public dcNo!: string;

  @prop({ type: String, trim: true, default: "" })
  public lotNo!: string;

  @prop({ type: String, trim: true, default: "" })
  public hsnCode?: string;

  @prop({ ref: () => UnitOfMeasurement, required: true })
  public uomId!: Ref<UnitOfMeasurement>;

  @prop({ required: true, min: 0, default: 1 })
  public uomQuantity!: number;

  @prop({ required: true, min: 0 })
  public actualQuantity!: number; // Reflects in stock deduction

  @prop({ required: true, min: 0 })
  public billedQuantity!: number;

  @prop({ required: false, min: 0 })
  public quantity?: number; // Legacy alias for actualQuantity

  @prop({ required: true, min: 0 })
  public rate!: number;

  @prop({ ref: () => PerUnit, required: true })
  public perId!: Ref<PerUnit>;

  @prop({ required: true, default: 0 })
  public amount!: number; // Calculated by backend: (billedQuantity * rate) / perMultiplier
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== Environment.PRODUCTION,
  },
})
@index(
  { salesNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
@index({ date: -1 })
@index({ partyId: 1 })
@index({ salesTypeId: 1 })
@index({ companyGodownId: 1 })
@index({ "items.itemId": 1 })
@index({ "items.godownId": 1 })
@index({ "items.godownStockId": 1 })
export class Sale {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public salesNumber!: string;

  // Custom/Manual Invoice Number entered during sales billing
  @prop({ type: String, trim: true, default: "" })
  public invoiceNo!: string;

  @prop({ required: true })
  public date!: Date;

  @prop({ ref: () => SalesType, required: true })
  public salesTypeId!: Ref<SalesType>;

  @prop({ ref: () => Party, required: true })
  public partyId!: Ref<Party>;

  // Common DC Number on top
  @prop({ type: String, trim: true, default: "" })
  public dcNo!: string;

  // Company Godown is optional at header level (derived from item stocks)
  @prop({ ref: () => "Godown", required: false })
  public companyGodownId?: Ref<any>;

  // Multi-item sales lines with individual godownStock doc reference
  @prop({ type: () => [SaleItem], required: true, default: [] })
  public items!: SaleItem[];

  @prop({ required: true, default: 0 })
  public subTotal!: number;

  @prop({ default: false })
  public isGstBill!: boolean;

  @prop({ default: 0 })
  public gstPercentage!: number;

  @prop({ default: 0 })
  public gstAmount!: number;

  @prop({ required: true, default: 0 })
  public totalAmount!: number;

  @prop({ required: false, default: 0 })
  public totalActualQuantity!: number;

  @prop({ required: false, default: 0 })
  public totalBilledQuantity!: number;

  @prop({ required: false, default: 0 })
  public totalQuantity!: number; // Legacy alias

  @prop({ type: String, trim: true, default: "" })
  public notes!: string;

  @prop({ type: String, trim: true, default: "" })
  public narration!: string;

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

export const SaleModel = getModelForClass(Sale);
