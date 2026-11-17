import { prop, getModelForClass, modelOptions, Ref, index } from "@typegoose/typegoose";
import { Admin } from "@/domain/entities/admin/Admin";
import { Environment } from "@/shared/constants/environment";
import { SessionDetails } from "@/shared/constants/SessionDetails";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== Environment.PRODUCTION,
  },
})
@index({ "validSessions.jwtToken": 1 })
export class AdminSession {
  @prop({ ref: () => "Admin", required: true })
  userId!: Ref<Admin>;

  @prop({ type: () => [SessionDetails], default: [] })
  validSessions!: SessionDetails[];
}

export const AdminSessionModel = getModelForClass(AdminSession);
