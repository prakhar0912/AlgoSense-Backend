import type IError from "../interfaces/error.js";
import type IValidatorResult from "../interfaces/validator.js";

export default class ValidationError extends Error implements IError {
    public name = 'ValidationError';
    public httpStatusCode = 400;

    constructor(
        public message: string = 'Provided data is invalid',
        public details?: {
            field: string,
            message: string
        }[]
    ) {
        super(message);
    }
}