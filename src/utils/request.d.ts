import type { Request } from "express";
export declare function parsePositiveInt(value: unknown, fieldName: string): number;
export declare function requireUser(req: Request): {
    id: number;
    roleId: number;
};
export declare function isAdmin(roleId: number): boolean;
export declare function canAccessUserResource(currentUser: {
    id: number;
    roleId: number;
}, ownerId: number): boolean;
//# sourceMappingURL=request.d.ts.map