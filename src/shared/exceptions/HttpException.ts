import { Logger } from "winston";

class HttpException extends Error {
  public status: number;
  public message: string;
  public errCode: string;
  public stage?: string;
  public logger?: Logger;
  public dynamicValues?: Record<string, string | number>;

  constructor(
    status: number,
    message: string,
    errCode: string,
    stage?: string,
    logger?: Logger,
    dynamicValues?: Record<string, string | number>
  ) {
    super(message);
    this.status = status;
    this.message = message;
    this.errCode = errCode;
    this.stage = stage;
    this.logger = logger;
    this.dynamicValues = dynamicValues;
  }
}

export default HttpException;
