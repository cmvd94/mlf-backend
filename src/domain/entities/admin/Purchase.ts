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
import { PurchaseType } from "./PurchaseType";
import { Item } from "./Item";
import { UnitOfMeasurement } from "./UnitOfMeasurement";
import { PerUnit } from "./PerUnit";
import { Types } from "mongoose";

export class PurchaseItem {
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

  @prop({ ref: () => UnitOfMeasurement, required: true })
  public uomId!: Ref<UnitOfMeasurement>;

  @prop({ required: true, min: 0, default: 1 })
  public uomQuantity!: number;

  @prop({ required: true, min: 0 })
  public actualQuantity!: number; // Reflects in stock value

  @prop({ required: true, min: 0 })
  public billedQuantity!: number;

  @prop({ required: true, min: 0 })
  public rate!: number;

  @prop({ ref: () => PerUnit, required: true })
  public perId!: Ref<PerUnit>;

  @prop({ required: true, default: 0 })
  public amount!: number; // Calculated by backend: billedQuantity * rate / perMultiplier

  @prop({ ref: () => "GodownStock", required: false })
  public godownStockId?: Ref<any>;
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== Environment.PRODUCTION,
  },
})
@index(
  { purchaseNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
@index({ date: -1 })
@index({ partyId: 1 })
@index({ companyGodownId: 1 })
@index({ "items.itemId": 1 })
@index({ "items.godownId": 1 })
export class Purchase {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public purchaseNumber!: string;

  @prop({ required: true })
  public date!: Date;

  @prop({ ref: () => "Godown", required: true })
  public companyGodownId!: Ref<any>;

  @prop({ ref: () => "Godown", required: false })
  public godownId?: Ref<any>;

  @prop({ ref: () => Party, required: true })
  public partyId!: Ref<Party>;

  @prop({ ref: () => PurchaseType, required: true })
  public purchaseTypeId!: Ref<PurchaseType>;

  // Multi-item purchase lines with individual godown assignment
  @prop({ type: () => [PurchaseItem], required: true, default: [] })
  public items!: PurchaseItem[];

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
  public totalBilledQuantity?: number;

  @prop({ required: false, default: 0 })
  public totalActualQuantity?: number;

  // Legacy single item fields for backward compatibility
  @prop({ ref: () => Item, required: false })
  public itemId?: Ref<Item>;

  @prop({ type: String, trim: true, default: "" })
  public dcNo?: string;

  @prop({ type: String, trim: true, default: "" })
  public lotNo?: string;

  @prop({ ref: () => UnitOfMeasurement, required: false })
  public uomId?: Ref<UnitOfMeasurement>;

  @prop({ required: false, min: 0 })
  public uomQuantity?: number;

  @prop({ required: false, min: 0 })
  public actualQuantity?: number;

  @prop({ required: false, min: 0 })
  public billedQuantity?: number;

  @prop({ required: false, min: 0 })
  public rate?: number;

  @prop({ ref: () => PerUnit, required: false })
  public perId?: Ref<PerUnit>;

  @prop({ required: false, default: 0 })
  public amount?: number;

  @prop({ ref: () => "GodownStock", required: false })
  public godownStockId?: Ref<any>;

  @prop({ type: String, trim: true, default: "" })
  public notes?: string;

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

export const PurchaseModel = getModelForClass(Purchase);
