import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma";
import {
  generateAuthTokens,
  hashPassword,
  verifyPassword,
  verifyToken,
} from "../services/authService";
import { isEmailDeliveryConfigured, sendPasswordResetEmail } from "../services/emailService";
import { verifyAccessToken } from "../middleware/authMiddleware";
import { ADMIN_ROLE_ID, USER_ROLE_ID } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { requireUser } from "../utils/request";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  refreshSchema,
  registerSchema,
  userProfileUpdateSchema,
} from "../utils/validation";

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

router.post("/password/forgot", async (req, res, next) => {
  try {
    if (!isEmailDeliveryConfigured()) {
      throw new ApiError(503, "A recuperação de senha está temporariamente indisponível.");
    }

    const parsed = passwordResetRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Informe um e-mail válido");
    }

    const user = await prisma.usuario.findFirst({
      where: { email: parsed.data.email },
      select: { id: true, nome: true, email: true },
    });

    if (user?.email) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.password_reset.deleteMany({ where: { id_usuario: user.id } });
      await prisma.password_reset.create({
        data: {
          id_usuario: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      });

      try {
        await sendPasswordResetEmail(user.email, user.nome, rawToken);
      } catch (emailError) {
        await prisma.password_reset.deleteMany({ where: { id_usuario: user.id } });
        console.error("Não foi possível enviar o e-mail de redefinição de senha:", emailError);
      }
    }

    res.status(200).json({
      message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/password/reset", async (req, res, next) => {
  try {
    const parsed = passwordResetSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Dados de redefinição inválidos");
    }

    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const resetRequest = await prisma.password_reset.findUnique({ where: { token_hash: tokenHash } });

    if (!resetRequest) {
      throw new ApiError(400, "Link de redefinição inválido ou expirado");
    }

    if (resetRequest.expires_at.getTime() <= Date.now()) {
      await prisma.password_reset.delete({ where: { id: resetRequest.id } });
      throw new ApiError(400, "Link de redefinição inválido ou expirado");
    }

    const passwordHash = await hashPassword(parsed.data.senha);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: resetRequest.id_usuario },
        data: { senha: passwordHash },
      }),
      prisma.password_reset.deleteMany({ where: { id_usuario: resetRequest.id_usuario } }),
    ]);

    res.status(200).json({ message: "Senha redefinida com sucesso." });
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

router.put("/me", verifyAccessToken, async (req, res, next) => {
  try {
    const parsedBody = userProfileUpdateSchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new ApiError(400, parsedBody.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const user = requireUser(req);

    const currentUser = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        id_tipo_usuario: true,
      },
    });

    if (!currentUser) {
      throw new ApiError(404, "Usuário não encontrado");
    }

    if (parsedBody.data.email !== undefined || parsedBody.data.telefone !== undefined) {
      const existingUser = await prisma.usuario.findFirst({
        where: {
          id: { not: user.id },
          OR: [
            ...(parsedBody.data.email ? [{ email: parsedBody.data.email }] : []),
            ...(parsedBody.data.telefone ? [{ telefone: parsedBody.data.telefone }] : []),
          ],
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new ApiError(409, "Email ou telefone já em uso");
      }
    }

    const updatedUser = await prisma.usuario.update({
      where: { id: user.id },
      data: {
        ...(parsedBody.data.nome !== undefined ? { nome: parsedBody.data.nome } : {}),
        ...(parsedBody.data.email !== undefined ? { email: parsedBody.data.email } : {}),
        ...(parsedBody.data.telefone !== undefined ? { telefone: parsedBody.data.telefone } : {}),
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        id_tipo_usuario: true,
      },
    });

    res.status(200).json({
      id: updatedUser.id,
      nome: updatedUser.nome,
      email: updatedUser.email,
      telefone: updatedUser.telefone,
      roleId: updatedUser.id_tipo_usuario,
    });
  } catch (error) {
    next(error);
  }
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
