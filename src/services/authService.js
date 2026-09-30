import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/errors";
const SALT_ROUNDS = 10;
function getEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function tokenSecretByType(tokenType) {
    if (tokenType === "access") {
        return getEnv("JWT_SECRET");
    }
    return getEnv("JWT_REFRESH_SECRET");
}
function tokenExpiryByType(tokenType) {
    if (tokenType === "access") {
        return (process.env.JWT_ACCESS_EXPIRY ?? "15m");
    }
    return (process.env.JWT_REFRESH_EXPIRY ?? "7d");
}
export async function hashPassword(plainTextPassword) {
    return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}
export async function verifyPassword(plainTextPassword, passwordHash) {
    return bcrypt.compare(plainTextPassword, passwordHash);
}
export function generateToken(userId, roleId, tokenType) {
    const payload = {
        userId,
        roleId,
        tokenType,
    };
    const expiresIn = tokenExpiryByType(tokenType);
    return jwt.sign(payload, tokenSecretByType(tokenType), {
        expiresIn,
    });
}
export function generateAuthTokens(userId, roleId) {
    return {
        accessToken: generateToken(userId, roleId, "access"),
        refreshToken: generateToken(userId, roleId, "refresh"),
    };
}
export function verifyToken(token, expectedTokenType) {
    try {
        const decoded = jwt.verify(token, tokenSecretByType(expectedTokenType));
        if (typeof decoded !== "object" || decoded === null) {
            throw new ApiError(401, "Invalid token payload");
        }
        const payload = decoded;
        if (typeof payload.userId !== "number" ||
            typeof payload.roleId !== "number" ||
            payload.tokenType !== expectedTokenType) {
            throw new ApiError(401, "Invalid token claims");
        }
        return payload;
    }
    catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(401, "Invalid or expired token");
    }
}
//# sourceMappingURL=authService.js.map