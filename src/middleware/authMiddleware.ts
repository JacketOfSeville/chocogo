import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/authService";
import { ApiError } from "../utils/errors";

export const USER_ROLE_ID = 1;
export const ADMIN_ROLE_ID = 2;

export function verifyAccessToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new ApiError(401, "Header de autorização inválido ou ausente"));
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    next(new ApiError(401, "Token de acesso ausente"));
    return;
  }

  try {
    const payload = verifyToken(token, "access");
    req.user = {
      id: payload.userId,
      roleId: payload.roleId,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(allowedRoleIds: number[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "Autenticação necessária"));
      return;
    }

    if (!allowedRoleIds.includes(req.user.roleId)) {
      next(new ApiError(403, "Você não tem permissão para realizar esta ação"));
      return;
    }

    next();
  };
}
