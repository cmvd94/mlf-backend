import { container } from "tsyringe";
import { CounterRepository } from "@/infrastructure/repositories/common/CounterRepository";

export const initCommonDI = () => {
  container.registerSingleton(CounterRepository, CounterRepository);
};
