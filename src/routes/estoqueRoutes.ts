import { Prisma } from "../../generated/prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID, requireRole, verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { parsePositiveInt } from "../utils/request";
import { estoqueCreateSchema, estoqueUpdateSchema } from "../utils/validation";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const estoque = await prisma.estoque.findMany({ orderBy: { id: "asc" } });
    res.status(200).json(estoque);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Estoque");
    const estoque = await prisma.estoque.findUnique({ where: { id } });

    if (!estoque) {
      throw new ApiError(404, "Estoque não encontrado");
    }

    res.status(200).json(estoque);
  } catch (error) {
    next(error);
  }
});

router.post("/", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const parsed = estoqueCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const produto = await prisma.produto.findUnique({
      where: { id: parsed.data.id_produto },
      select: { id: true },
    });

    if (!produto) {
      throw new ApiError(400, "id_produto deve referenciar um produto existente");
    }

    const created = await prisma.estoque.create({
      data: {
        id_produto: parsed.data.id_produto,
        quantidade: parsed.data.quantidade,
        quantidade_min: parsed.data.quantidade_min,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Estoque");
    const parsed = estoqueUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.estoque.findUnique({ where: { id }, select: { id: true } });

    if (!current) {
      throw new ApiError(404, "Estoque não encontrado");
    }

    if (parsed.data.id_produto !== undefined) {
      const produto = await prisma.produto.findUnique({
        where: { id: parsed.data.id_produto },
        select: { id: true },
      });

      if (!produto) {
        throw new ApiError(400, "id_produto deve referenciar um produto existente");
      }
    }

    const updateData: Prisma.estoqueUncheckedUpdateInput = {};

    if (parsed.data.id_produto !== undefined) {
      updateData.id_produto = parsed.data.id_produto;
    }

    if (parsed.data.quantidade !== undefined) {
      updateData.quantidade = parsed.data.quantidade;
    }

    if (parsed.data.quantidade_min !== undefined) {
      updateData.quantidade_min = parsed.data.quantidade_min;
    }

    const updated = await prisma.estoque.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Estoque");
    const current = await prisma.estoque.findUnique({ where: { id }, select: { id: true } });

    if (!current) {
      throw new ApiError(404, "Estoque não encontrado");
    }

    await prisma.estoque.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as estoqueRoutes };
