import type IError from "../interfaces/error.js";
export default class ValidationError extends Error implements IError {
    message: string;
    details?: {
        field: string;
        message: string;
    }[] | undefined;
    name: string;
    httpStatusCode: number;
    constructor(message?: string, details?: {
        field: string;
        message: string;
    }[] | undefined);
}
//# sourceMappingURL=validationError.d.ts.map