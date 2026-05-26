import type IError from "../interfaces/error.js";

export default class UnauthorizedError extends Error implements IError {
    public name = 'UnauthorizedError';
    public httpStatusCode = 401;

    constructor(
        public message: string = 'Unauthorized access',
        public details?: any
    ) {
        super(message);
    }
}