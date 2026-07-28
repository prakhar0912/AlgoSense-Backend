export default class ValidationError extends Error {
    message;
    details;
    name = 'ValidationError';
    httpStatusCode = 400;
    constructor(message = 'Provided data is invalid', details) {
        super(message);
        this.message = message;
        this.details = details;
    }
}
//# sourceMappingURL=validationError.js.map