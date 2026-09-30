import type { NextFunction, Request, Response } from "express";
export declare const USER_ROLE_ID = 1;
export declare const ADMIN_ROLE_ID = 2;
export declare function verifyAccessToken(req: Request, _res: Response, next: NextFunction): void;
export declare function requireRole(allowedRoleIds: number[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=authMiddleware.d.ts.map