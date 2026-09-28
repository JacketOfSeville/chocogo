import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID, USER_ROLE_ID, requireRole, verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { parsePositiveInt, requireUser } from "../utils/request";
import { usuarioRoleUpdateSchema } from "../utils/validation";

const router = Router();

router.use(verifyAccessToken, requireRole([ADMIN_ROLE_ID]));

router.get("/", async (req, res, next) => {
  try {
    const idsRaw = req.query.ids;

    let whereClause = undefined;

    if (idsRaw !== undefined) {
      if (typeof idsRaw !== "string") {
        throw new ApiError(400, "Query ids inválida");
      }

      const ids = idsRaw
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map((part) => parsePositiveInt(part, "id de Usuario"));

      if (ids.length === 0) {
        throw new ApiError(400, "Informe ids na query");
      }

      whereClause = { id: { in: ids } };
    }

    const usuarios = await prisma.usuario.findMany({
      ...(whereClause ? { where: whereClause } : {}),
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        id_tipo_usuario: true,
        data_criacao: true,
      },
      orderBy: { id: "asc" },
    });

    res.status(200).json(usuarios);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Usuario");
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        id_tipo_usuario: true,
        data_criacao: true,
        endereco: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            id_usuario: true,
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            cep: true,
            principal: true,
          },
        },
        pedido: {
          orderBy: { id: "desc" },
          select: {
            id: true,
            id_usuario: true,
            id_endereco: true,
            id_status_pedido: true,
            id_tipo_entrega: true,
            meio_pagamento: true,
            valor_total: true,
            valor_frete: true,
            data_pedido: true,
            pronto_retirada: true,
            entregue: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new ApiError(404, "Usuario não encontrado");
    }

    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
});

router.put("/:id/role", async (req, res, next) => {
  try {
    const targetId = parsePositiveInt(req.params.id, "id de Usuario");
    const actor = requireUser(req);
    const parsed = usuarioRoleUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Papel de usuário inválido");
    }

    if (targetId === actor.id && parsed.data.id_tipo_usuario === USER_ROLE_ID) {
      throw new ApiError(403, "Você não pode remover sua própria permissão de administrador");
    }

    const target = await prisma.usuario.findUnique({ where: { id: targetId }, select: { id: true } });

    if (!target) {
      throw new ApiError(404, "Usuário não encontrado");
    }

    const updated = await prisma.usuario.update({
      where: { id: targetId },
      data: { id_tipo_usuario: parsed.data.id_tipo_usuario },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        id_tipo_usuario: true,
        data_criacao: true,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

export { router as usuarioRoutes };