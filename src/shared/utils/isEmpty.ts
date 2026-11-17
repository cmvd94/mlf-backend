import { Types } from "mongoose";

export const isEmpty = (
  arr?: number[] | string[] | Types.ObjectId[] | any[]
) => {
  if (!arr || arr.length === 0) return 0;
  else return arr.length;
};
