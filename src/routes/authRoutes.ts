import { Router } from "express";
import { prisma } from "../../lib/prisma";
import {
  generateAuthTokens,
  hashPassword,
  verifyPassword,
  verifyToken,
} from "../services/authService";
import { ADMIN_ROLE_ID, USER_ROLE_ID } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { loginSchema, refreshSchema, registerSchema } from "../utils/validation";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const parsedBody = registerSchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new ApiError(400, parsedBody.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const { nome, email, telefone, senha } = parsedBody.data;

    const existingUser = await prisma.usuario.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(telefone ? [{ telefone }] : []),
        ],
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ApiError(409, "Email ou telefone já em uso");
    }

    const passwordHash = await hashPassword(senha);

    const user = await prisma.usuario.create({
      data: {
        nome,
        email: email ?? null,
        telefone: telefone ?? null,
        senha: passwordHash,
        id_tipo_usuario: USER_ROLE_ID,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        id_tipo_usuario: true,
      },
    });

    const tokens = generateAuthTokens(user.id, user.id_tipo_usuario);

    res.status(201).json({
      ...tokens,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        roleId: user.id_tipo_usuario,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsedBody = loginSchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new ApiError(400, parsedBody.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const { email, telefone, senha } = parsedBody.data;

    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(telefone ? [{ telefone }] : []),
        ],
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        senha: true,
        id_tipo_usuario: true,
      },
    });

    if (!user) {
      throw new ApiError(401, "Credenciais inválidas");
    }

    const isPasswordValid = await verifyPassword(senha, user.senha);

    if (!isPasswordValid) {
      throw new ApiError(401, "Credenciais inválidas");
    }

    const tokens = generateAuthTokens(user.id, user.id_tipo_usuario);

    res.status(200).json({
      ...tokens,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        roleId: user.id_tipo_usuario,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const parsedBody = refreshSchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new ApiError(400, parsedBody.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const payload = verifyToken(parsedBody.data.refreshToken, "refresh");
    const accessToken = generateAuthTokens(payload.userId, payload.roleId).accessToken;

    res.status(200).json({ accessToken });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.status(200).json({ message: "Logout successful" });
});

router.get("/roles", (_req, res) => {
  res.status(200).json({
    roles: [
      { id: USER_ROLE_ID, description: "user" },
      { id: ADMIN_ROLE_ID, description: "admin" },
    ],
  });
});

export { router as authRoutes };
