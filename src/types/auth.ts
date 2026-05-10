export type TokenType = "access" | "refresh";

export interface JwtPayload {
  userId: number;
  roleId: number;
  tokenType: TokenType;
}

export interface AuthenticatedUser {
  id: number;
  roleId: number;
}
