import { ApiError } from "./errors";
import { ADMIN_ROLE_ID } from "../middleware/authMiddleware";
export function parsePositiveInt(value, fieldName) {
    if (typeof value !== "string") {
        throw new ApiError(400, `${fieldName} inválido`);
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ApiError(400, `${fieldName} inválido`);
    }
    return parsed;
}
export function requireUser(req) {
    if (!req.user) {
        throw new ApiError(401, "Autenticação obrigatória");
    }
    return req.user;
}
export function isAdmin(roleId) {
    return roleId === ADMIN_ROLE_ID;
}
export function canAccessUserResource(currentUser, ownerId) {
    return isAdmin(currentUser.roleId) || currentUser.id === ownerId;
}
//# sourceMappingURL=request.js.map