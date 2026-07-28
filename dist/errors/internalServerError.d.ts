import type IError from "../interfaces/error.js";
export default class InternalServerError extends Error implements IError {
    message: string;
    originalError?: any | undefined;
    name: string;
    httpStatusCode: number;
    constructor(message?: string, originalError?: any | undefined);
}
//# sourceMappingURL=internalServerError.d.ts.map