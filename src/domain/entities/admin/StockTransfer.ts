import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  Ref,
} from "@typegoose/typegoose";
import { Environment } from "@/shared/constants/environment";
import { Admin } from "./Admin";
import { Item } from "./Item";
import { UnitOfMeasurement } from "./UnitOfMeasurement";
import { PerUnit } from "./PerUnit";
import { Types } from "mongoose";

export class StockTransferSourceItem {
  @prop({ ref: () => "GodownStock", required: true })
  public godownStockId!: Ref<any>;

  @prop({ ref: () => Item, required: true })
  public itemId!: Ref<Item>;

  @prop({ ref: () => "Godown", required: true })
  public godownId!: Ref<any>;

  @prop({ type: String, trim: true, default: "" })
  public batchNo!: string;

  @prop({ ref: () => UnitOfMeasurement, required: false })
  public uomId?: Ref<UnitOfMeasurement>;

  @prop({ required: false, default: 1 })
  public uomQuantity?: number;

  @prop({ required: true, min: 0 })
  public quantity!: number;

  @prop({ required: false, default: 0 })
  public rate?: number;

  @prop({ ref: () => PerUnit, required: false })
  public perId?: Ref<PerUnit>;

  @prop({ required: false, default: 0 })
  public amount?: number;
}

export class StockTransferDestinationItem {
  @prop({ ref: () => Item, required: true })
  public itemId!: Ref<Item>;

  @prop({ ref: () => "Godown", required: true })
  public godownId!: Ref<any>;

  @prop({ type: String, trim: true, default: "" })
  public batchNo!: string;

  @prop({ ref: () => UnitOfMeasurement, required: false })
  public uomId?: Ref<UnitOfMeasurement>;

  @prop({ required: false, default: 1 })
  public uomQuantity?: number;

  @prop({ required: true, min: 0 })
  public quantity!: number;

  @prop({ required: false, default: 0 })
  public rate?: number;

  @prop({ ref: () => PerUnit, required: false })
  public perId?: Ref<PerUnit>;

  @prop({ required: false, default: 0 })
  public amount?: number;

  @prop({ ref: () => "GodownStock", required: false })
  public destinationGodownStockId?: Ref<any>;
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== Environment.PRODUCTION,
  },
})
@index(
  { transferNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)
@index({ date: -1 })
@index({ "sourceItems.godownId": 1 })
@index({ "sourceItems.itemId": 1 })
@index({ "destinationItems.godownId": 1 })
@index({ "destinationItems.itemId": 1 })
export class StockTransfer {
  @prop({ auto: true })
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public transferNumber!: string;

  @prop({ required: true })
  public date!: Date;

  // Source (Consumption) items
  @prop({ type: () => [StockTransferSourceItem], required: true, default: [] })
  public sourceItems!: StockTransferSourceItem[];

  // Destination (Production / Movement) items
  @prop({ type: () => [StockTransferDestinationItem], required: true, default: [] })
  public destinationItems!: StockTransferDestinationItem[];

  @prop({ required: true, default: 0 })
  public totalSourceQuantity!: number;

  @prop({ required: true, default: 0 })
  public totalSourceAmount!: number;

  @prop({ required: true, default: 0 })
  public totalDestinationQuantity!: number;

  @prop({ required: true, default: 0 })
  public totalDestinationAmount!: number;

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

export const StockTransferModel = getModelForClass(StockTransfer);
