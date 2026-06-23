import { Prisma } from "../../generated/prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { canAccessUserResource, isAdmin, parsePositiveInt, requireUser } from "../utils/request";
import { pedidoCreateSchema, pedidoUpdateSchema } from "../utils/validation";

const router = Router();

async function ensurePedidoReferences(input: {
  id_usuario: number;
  id_endereco?: number | null | undefined;
  id_status_pedido: number;
  id_tipo_entrega: number;
}): Promise<void> {
  const [usuario, statusPedido, tipoEntrega, endereco] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: input.id_usuario }, select: { id: true } }),
    prisma.status_pedido.findUnique({ where: { id: input.id_status_pedido }, select: { id: true } }),
    prisma.tipo_entrega.findUnique({ where: { id: input.id_tipo_entrega }, select: { id: true } }),
    input.id_endereco == null
      ? Promise.resolve(null)
      : prisma.endereco.findUnique({ where: { id: input.id_endereco }, select: { id: true, id_usuario: true } }),
  ]);

  if (!usuario) {
    throw new ApiError(400, "id_usuario deve existir");
  }

  if (!statusPedido) {
    throw new ApiError(400, "id_status_pedido deve existir");
  }

  if (!tipoEntrega) {
    throw new ApiError(400, "id_tipo_entrega deve existir");
  }

  if (input.id_endereco != null) {
    if (!endereco) {
      throw new ApiError(400, "id_endereco deve existir");
    }

    if (endereco.id_usuario !== input.id_usuario) {
      throw new ApiError(400, "id_endereco deve pertencer ao id_usuario informado");
    }
  }
}

router.use(verifyAccessToken);

router.get("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const pedidos = await prisma.pedido.findMany({
      where: isAdmin(user.roleId) ? {} : { id_usuario: user.id },
      orderBy: { id: "asc" },
    });

    res.status(200).json(pedidos);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Pedido");
    const user = requireUser(req);
    const pedido = await prisma.pedido.findUnique({ where: { id } });

    if (!pedido) {
      throw new ApiError(404, "Pedido não encontrado");
    }

    if (!canAccessUserResource(user, pedido.id_usuario)) {
      throw new ApiError(403, "Sem permissão para acessar este pedido");
    }

    res.status(200).json(pedido);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const parsed = pedidoCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const targetUserId = parsed.data.id_usuario ?? user.id;

    if (!canAccessUserResource(user, targetUserId)) {
      throw new ApiError(403, "Sem permissão para criar pedido para outro usuário");
    }

    await ensurePedidoReferences({
      id_usuario: targetUserId,
      id_endereco: parsed.data.id_endereco,
      id_status_pedido: parsed.data.id_status_pedido,
      id_tipo_entrega: parsed.data.id_tipo_entrega,
    });

    const created = await prisma.pedido.create({
      data: {
        id_usuario: targetUserId,
        ...(parsed.data.id_endereco !== undefined ? { id_endereco: parsed.data.id_endereco } : {}),
        id_status_pedido: parsed.data.id_status_pedido,
        id_tipo_entrega: parsed.data.id_tipo_entrega,
        ...(parsed.data.pronto_retirada !== undefined ? { pronto_retirada: parsed.data.pronto_retirada } : {}),
        ...(parsed.data.entregue !== undefined ? { entregue: parsed.data.entregue } : {}),
        meio_pagamento: parsed.data.meio_pagamento,
        valor_total: new Prisma.Decimal(parsed.data.valor_total),
        valor_frete: new Prisma.Decimal(parsed.data.valor_frete),
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Pedido");
    const user = requireUser(req);
    const parsed = pedidoUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.pedido.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Pedido não encontrado");
    }

    if (!canAccessUserResource(user, current.id_usuario)) {
      throw new ApiError(403, "Sem permissão para atualizar este pedido");
    }

    const targetUserId = parsed.data.id_usuario ?? current.id_usuario;

    if (!canAccessUserResource(user, targetUserId)) {
      throw new ApiError(403, "Sem permissão para transferir pedido para outro usuário");
    }

    if ((parsed.data.pronto_retirada !== undefined || parsed.data.entregue !== undefined) && !isAdmin(user.roleId)) {
      throw new ApiError(403, "Somente administradores podem atualizar flags de entrega");
    }

    if (
      parsed.data.id_usuario !== undefined ||
      parsed.data.id_endereco !== undefined ||
      parsed.data.id_status_pedido !== undefined ||
      parsed.data.id_tipo_entrega !== undefined
    ) {
      await ensurePedidoReferences({
        id_usuario: targetUserId,
        id_endereco: parsed.data.id_endereco !== undefined ? parsed.data.id_endereco : current.id_endereco,
        id_status_pedido: parsed.data.id_status_pedido ?? current.id_status_pedido,
        id_tipo_entrega: parsed.data.id_tipo_entrega ?? current.id_tipo_entrega,
      });
    }

    const updateData: Prisma.pedidoUncheckedUpdateInput = {};

    if (parsed.data.id_usuario !== undefined) {
      updateData.id_usuario = parsed.data.id_usuario;
    }

    if (parsed.data.id_endereco !== undefined) {
      updateData.id_endereco = parsed.data.id_endereco;
    }

    if (parsed.data.id_status_pedido !== undefined) {
      updateData.id_status_pedido = parsed.data.id_status_pedido;
    }

    if (parsed.data.id_tipo_entrega !== undefined) {
      updateData.id_tipo_entrega = parsed.data.id_tipo_entrega;
    }

    if (parsed.data.pronto_retirada !== undefined) {
      updateData.pronto_retirada = parsed.data.pronto_retirada;
    }

    if (parsed.data.entregue !== undefined) {
      updateData.entregue = parsed.data.entregue;
    }

    if (parsed.data.meio_pagamento !== undefined) {
      updateData.meio_pagamento = parsed.data.meio_pagamento;
    }

    if (parsed.data.valor_total !== undefined) {
      updateData.valor_total = new Prisma.Decimal(parsed.data.valor_total);
    }

    if (parsed.data.valor_frete !== undefined) {
      updateData.valor_frete = new Prisma.Decimal(parsed.data.valor_frete);
    }

    const updated = await prisma.pedido.update({ where: { id }, data: updateData });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Pedido");
    const user = requireUser(req);
    const current = await prisma.pedido.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Pedido não encontrado");
    }

    if (!canAccessUserResource(user, current.id_usuario)) {
      throw new ApiError(403, "Sem permissão para remover este pedido");
    }

    await prisma.pedido.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as pedidoRoutes };
