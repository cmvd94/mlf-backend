import mongoose, { ClientSession } from "mongoose";
import { MONGODB_TRANSACTION_FAILED } from "../constants/mongdbError";

export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction();
    (err as any).stage = MONGODB_TRANSACTION_FAILED;
    throw err;
  } finally {
    session.endSession();
  }
}
