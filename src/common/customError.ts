import { ErrorMap } from './error.map';
export class CustomError extends Error {
  constructor(
    public errorMap: typeof ErrorMap.SUCCESSFUL,
    public msg?: string,
  ) {
    super(errorMap.Code);
  }
}
