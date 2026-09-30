export declare class ApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string);
}
export declare function isApiError(error: unknown): error is ApiError;
//# sourceMappingURL=errors.d.ts.map