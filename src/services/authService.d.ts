import type { JwtPayload, TokenType } from "../types/auth";
export declare function hashPassword(plainTextPassword: string): Promise<string>;
export declare function verifyPassword(plainTextPassword: string, passwordHash: string): Promise<boolean>;
export declare function generateToken(userId: number, roleId: number, tokenType: TokenType): string;
export declare function generateAuthTokens(userId: number, roleId: number): {
    accessToken: string;
    refreshToken: string;
};
export declare function verifyToken(token: string, expectedTokenType: TokenType): JwtPayload;
//# sourceMappingURL=authService.d.ts.map