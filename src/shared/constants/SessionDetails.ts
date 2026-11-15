import { prop } from "@typegoose/typegoose";

export class SessionDetails {
  @prop({ required: true })
  jwtToken!: string;

  @prop({ required: true })
  deviceId!: string;

  @prop()
  deviceToken?: string;

  @prop({ required: true })
  deviceType!: string;

  @prop({ required: true })
  expiresAt!: Date;
}
