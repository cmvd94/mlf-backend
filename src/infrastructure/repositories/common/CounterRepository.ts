import { injectable } from "tsyringe";
import { CounterModel } from "@/domain/entities/common/Counter";
import { AdminModel } from "@/domain/entities/admin/Admin";
import { Logger } from "winston";
import { ClientSession } from "mongoose";

@injectable()
export class CounterRepository {
  constructor() {}

  async getNextSequence(
    modelName: string,
    logger?: Logger,
    session?: ClientSession
  ): Promise<number> {
    try {
      // If counter for ADMIN_EMPLOYEE_ID doesn't exist yet, seed it with the highest existing employeeId sequence
      if (modelName === "ADMIN_EMPLOYEE_ID") {
        const existingCounter = await CounterModel.findOne({ modelName }).session(
          session || null
        );
        if (!existingCounter) {
          // Find highest numerical suffix in employeeId among existing admins (e.g. mlf_01 -> 1)
          const allAdmins = await AdminModel.find({}, { employeeId: 1 })
            .session(session || null)
            .lean();
          let maxSeq = 0;
          for (const admin of allAdmins) {
            if (admin.employeeId) {
              const match = admin.employeeId.match(/^mlf_(\d+)$/i);
              if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxSeq) {
                  maxSeq = num;
                }
              }
            }
          }
          if (maxSeq > 0) {
            await CounterModel.findOneAndUpdate(
              { modelName },
              { $setOnInsert: { seq: maxSeq } },
              { upsert: true, session }
            );
          }
        }
      }

      const counter = await CounterModel.findOneAndUpdate(
        { modelName },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      )
        .lean()
        .exec();

      return counter.seq;
    } catch (error) {
      if (logger) {
        logger.error(
          `[CounterRepository.getNextSequence]: Failed to get next sequence for ${modelName}`,
          error
        );
      }
      throw new Error(
        `[CounterRepository.getNextSequence]: Failed to get next sequence ${error}`
      );
    }
  }
}
