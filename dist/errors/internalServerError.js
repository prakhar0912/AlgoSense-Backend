export default class InternalServerError extends Error {
    message;
    originalError;
    name = 'InternalServerError';
    httpStatusCode = 500;
    constructor(message = 'Internal Server Error', originalError) {
        super(message);
        this.message = message;
        this.originalError = originalError;
        // this.originalError = originalError
    }
}
//# sourceMappingURL=internalServerError.js.map