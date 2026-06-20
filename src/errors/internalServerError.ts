import type IError from "../interfaces/error.js";

export default class InternalServerError extends Error implements IError {
    public name = 'InternalServerError';
    public httpStatusCode = 500;

    constructor(
        public message: string = 'Internal Server Error',
        public originalError?: any
    ) {
        super(message);
        // this.originalError = originalError
    }
}