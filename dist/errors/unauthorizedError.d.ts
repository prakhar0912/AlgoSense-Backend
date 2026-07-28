import type IError from "../interfaces/error.js";
export default class UnauthorizedError extends Error implements IError {
    message: string;
    details?: any | undefined;
    name: string;
    httpStatusCode: number;
    constructor(message?: string, details?: any | undefined);
}
//# sourceMappingURL=unauthorizedError.d.ts.map