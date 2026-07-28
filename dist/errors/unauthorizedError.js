export default class UnauthorizedError extends Error {
    message;
    details;
    name = 'UnauthorizedError';
    httpStatusCode = 401;
    constructor(message = 'Unauthorized access', details) {
        super(message);
        this.message = message;
        this.details = details;
    }
}
//# sourceMappingURL=unauthorizedError.js.map