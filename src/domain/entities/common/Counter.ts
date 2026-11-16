import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
export class Counter {
  @prop({ required: true, unique: true })
  modelName!: string;

  @prop({ default: 0 })
  seq!: number;
}

export const CounterModel = getModelForClass(Counter);
