import { Prisma } from "../../generated/prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { canAccessUserResource, parsePositiveInt, requireUser } from "../utils/request";
import { pedidoItemCreateSchema, pedidoItemUpdateSchema } from "../utils/validation";

const router = Router();

async function getOwnedPedido(id_pedido: number, user: { id: number; roleId: number }) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: id_pedido },
    select: { id: true, id_usuario: true },
  });

  if (!pedido) {
    throw new ApiError(404, "Pedido não encontrado");
  }

  if (!canAccessUserResource(user, pedido.id_usuario)) {
    throw new ApiError(403, "Sem permissão para este pedido");
  }

  return pedido;
}

async function getProdutoPreco(id_produto: number): Promise<Prisma.Decimal> {
  const produto = await prisma.produto.findUnique({
    where: { id: id_produto },
    select: { preco: true },
  });

  if (!produto) {
    throw new ApiError(400, "id_produto deve existir");
  }

  return produto.preco;
}

router.use(verifyAccessToken);

router.get("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const pedidoIdParam = req.query.id_pedido;

    if (!pedidoIdParam || Array.isArray(pedidoIdParam)) {
      throw new ApiError(400, "Informe id_pedido na query");
    }

    const id_pedido = parsePositiveInt(pedidoIdParam, "id_pedido");
    await getOwnedPedido(id_pedido, user);

    const itens = await prisma.pedido_item.findMany({
      where: { id_pedido },
      orderBy: { id: "asc" },
    });

    res.status(200).json(itens);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Item de pedido");
    const user = requireUser(req);
    const item = await prisma.pedido_item.findUnique({ where: { id } });

    if (!item) {
      throw new ApiError(404, "Item de pedido não encontrado");
    }

    await getOwnedPedido(item.id_pedido, user);

    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const parsed = pedidoItemCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    await getOwnedPedido(parsed.data.id_pedido, user);
    const precoMomento = parsed.data.preco_momento !== undefined
      ? new Prisma.Decimal(parsed.data.preco_momento)
      : await getProdutoPreco(parsed.data.id_produto);
    const subtotal = precoMomento.mul(parsed.data.quantidade);

    const created = await prisma.pedido_item.create({
      data: {
        id_pedido: parsed.data.id_pedido,
        id_produto: parsed.data.id_produto,
        quantidade: parsed.data.quantidade,
        preco_momento: precoMomento,
        subtotal,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Item de pedido");
    const user = requireUser(req);
    const parsed = pedidoItemUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.pedido_item.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Item de pedido não encontrado");
    }

    await getOwnedPedido(current.id_pedido, user);
    const targetPedidoId = parsed.data.id_pedido ?? current.id_pedido;
    await getOwnedPedido(targetPedidoId, user);

    const targetProdutoId = parsed.data.id_produto ?? current.id_produto;
    const targetQuantidade = parsed.data.quantidade ?? current.quantidade;
    const precoMomento = parsed.data.preco_momento !== undefined
      ? new Prisma.Decimal(parsed.data.preco_momento)
      : parsed.data.id_produto !== undefined
        ? await getProdutoPreco(parsed.data.id_produto)
        : current.preco_momento;
    const subtotal = precoMomento.mul(targetQuantidade);

    const updateData: Prisma.pedido_itemUncheckedUpdateInput = {
      subtotal,
      preco_momento: precoMomento,
    };

    if (parsed.data.id_pedido !== undefined) {
      updateData.id_pedido = parsed.data.id_pedido;
    }

    if (parsed.data.id_produto !== undefined) {
      updateData.id_produto = targetProdutoId;
    }

    if (parsed.data.quantidade !== undefined) {
      updateData.quantidade = targetQuantidade;
    }

    const updated = await prisma.pedido_item.update({ where: { id }, data: updateData });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Item de pedido");
    const user = requireUser(req);
    const current = await prisma.pedido_item.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Item de pedido não encontrado");
    }

    await getOwnedPedido(current.id_pedido, user);

    await prisma.pedido_item.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as pedidoItensRoutes };
