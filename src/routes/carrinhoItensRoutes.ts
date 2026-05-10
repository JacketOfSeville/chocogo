import { Prisma } from "../../generated/prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { canAccessUserResource, parsePositiveInt, requireUser } from "../utils/request";
import { carrinhoItemCreateSchema, carrinhoItemUpdateSchema } from "../utils/validation";

const router = Router();

async function assertCarrinhoOwnership(carrinhoId: number, user: { id: number; roleId: number }): Promise<void> {
  const carrinho = await prisma.carrinho.findUnique({
    where: { id: carrinhoId },
    select: { id_usuario: true },
  });

  if (!carrinho) {
    throw new ApiError(404, "Carrinho não encontrado");
  }

  if (!canAccessUserResource(user, carrinho.id_usuario)) {
    throw new ApiError(403, "Sem permissão para este carrinho");
  }
}

router.use(verifyAccessToken);

router.get("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const carrinhoIdParam = req.query.id_carrinho;

    if (!carrinhoIdParam || Array.isArray(carrinhoIdParam)) {
      throw new ApiError(400, "Informe id_carrinho na query");
    }

    const id_carrinho = parsePositiveInt(carrinhoIdParam, "id_carrinho");
    await assertCarrinhoOwnership(id_carrinho, user);

    const itens = await prisma.carrinho_itens.findMany({
      where: { id_carrinho },
      orderBy: { id: "asc" },
    });

    res.status(200).json(itens);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Item de carrinho");
    const user = requireUser(req);

    const item = await prisma.carrinho_itens.findUnique({ where: { id } });

    if (!item) {
      throw new ApiError(404, "Item de carrinho não encontrado");
    }

    await assertCarrinhoOwnership(item.id_carrinho, user);

    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const parsed = carrinhoItemCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    await assertCarrinhoOwnership(parsed.data.id_carrinho, user);

    const produto = await prisma.produto.findUnique({
      where: { id: parsed.data.id_produto },
      select: { id: true },
    });

    if (!produto) {
      throw new ApiError(400, "id_produto deve existir");
    }

    const created = await prisma.carrinho_itens.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Item de carrinho");
    const user = requireUser(req);
    const parsed = carrinhoItemUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.carrinho_itens.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Item de carrinho não encontrado");
    }

    await assertCarrinhoOwnership(current.id_carrinho, user);

    const targetCarrinhoId = parsed.data.id_carrinho ?? current.id_carrinho;
    await assertCarrinhoOwnership(targetCarrinhoId, user);

    if (parsed.data.id_produto !== undefined) {
      const produto = await prisma.produto.findUnique({
        where: { id: parsed.data.id_produto },
        select: { id: true },
      });

      if (!produto) {
        throw new ApiError(400, "id_produto deve existir");
      }
    }

    const updateData: Prisma.carrinho_itensUncheckedUpdateInput = {};

    if (parsed.data.id_carrinho !== undefined) {
      updateData.id_carrinho = parsed.data.id_carrinho;
    }

    if (parsed.data.id_produto !== undefined) {
      updateData.id_produto = parsed.data.id_produto;
    }

    if (parsed.data.quantidade !== undefined) {
      updateData.quantidade = parsed.data.quantidade;
    }

    const updated = await prisma.carrinho_itens.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Item de carrinho");
    const user = requireUser(req);

    const current = await prisma.carrinho_itens.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Item de carrinho não encontrado");
    }

    await assertCarrinhoOwnership(current.id_carrinho, user);

    await prisma.carrinho_itens.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as carrinhoItensRoutes };
