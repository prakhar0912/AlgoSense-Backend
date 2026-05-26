import type IError from "../interfaces/error.js";

export default class NotFoundError extends Error implements IError {
    public name = 'NotFoundError';
    public httpStatusCode = 404;

    constructor(
        public message: string = 'Requested resource not found',
        public details?: any
    ) {
        super(message);
    }
}