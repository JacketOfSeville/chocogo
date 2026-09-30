export class ApiError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
    }
}
export function isApiError(error) {
    return error instanceof ApiError;
}
//# sourceMappingURL=errors.js.map