export default class NotFoundError extends Error {
    message;
    details;
    name = 'NotFoundError';
    httpStatusCode = 404;
    constructor(message = 'Requested resource not found', details) {
        super(message);
        this.message = message;
        this.details = details;
    }
}
//# sourceMappingURL=notFoundError.js.map