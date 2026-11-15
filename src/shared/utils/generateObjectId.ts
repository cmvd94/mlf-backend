import { Types } from "mongoose";

export const generateObjectId = (id?: string) => {
  if (id) {
    return new Types.ObjectId(id);
  } else {
    return new Types.ObjectId();
  }
};

export const generateObjectIdsList = (ids?: string[]) => {
  if (ids?.length) {
    return ids.map((id) => new Types.ObjectId(id));
  }
  return [];
};
