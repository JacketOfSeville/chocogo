import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/errors";
import type { JwtPayload, TokenType } from "../types/auth";

const SALT_ROUNDS = 10;
type JwtExpiresIn = Exclude<jwt.SignOptions["expiresIn"], undefined>;

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function tokenSecretByType(tokenType: TokenType): string {
  if (tokenType === "access") {
    return getEnv("JWT_SECRET");
  }

  return getEnv("JWT_REFRESH_SECRET");
}

function tokenExpiryByType(tokenType: TokenType): JwtExpiresIn {
  if (tokenType === "access") {
    return (process.env.JWT_ACCESS_EXPIRY ?? "15m") as JwtExpiresIn;
  }

  return (process.env.JWT_REFRESH_EXPIRY ?? "7d") as JwtExpiresIn;
}

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

export function generateToken(userId: number, roleId: number, tokenType: TokenType): string {
  const payload: JwtPayload = {
    userId,
    roleId,
    tokenType,
  };

  const expiresIn = tokenExpiryByType(tokenType);

  return jwt.sign(payload, tokenSecretByType(tokenType), {
    expiresIn,
  });
}

export function generateAuthTokens(userId: number, roleId: number): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateToken(userId, roleId, "access"),
    refreshToken: generateToken(userId, roleId, "refresh"),
  };
}

export function verifyToken(token: string, expectedTokenType: TokenType): JwtPayload {
  try {
    const decoded = jwt.verify(token, tokenSecretByType(expectedTokenType));

    if (typeof decoded !== "object" || decoded === null) {
      throw new ApiError(401, "Invalid token payload");
    }

    const payload = decoded as Partial<JwtPayload>;

    if (
      typeof payload.userId !== "number" ||
      typeof payload.roleId !== "number" ||
      payload.tokenType !== expectedTokenType
    ) {
      throw new ApiError(401, "Invalid token claims");
    }

    return payload as JwtPayload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(401, "Invalid or expired token");
  }
}
