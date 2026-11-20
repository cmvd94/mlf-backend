import { Types } from "mongoose";

export const generateObjectId = (id?: any): Types.ObjectId => {
  if (id) {
    if (id instanceof Types.ObjectId) {
      return id;
    }
    if (typeof id === "object" && id._id) {
      return id._id instanceof Types.ObjectId
        ? id._id
        : new Types.ObjectId(id._id.toString());
    }
    if (typeof id === "string") {
      const trimmed = id.trim();
      if (Types.ObjectId.isValid(trimmed)) {
        return new Types.ObjectId(trimmed);
      }
    }
    return new Types.ObjectId(id);
  }
  return new Types.ObjectId();
};

export const generateObjectIdsList = (ids?: string[]) => {
  if (ids?.length) {
    return ids.map((id) => new Types.ObjectId(id));
  }
  return [];
};
