import { Prisma } from "../../generated/prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID, requireRole, verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { parsePositiveInt } from "../utils/request";
import { categoriaCreateSchema, categoriaUpdateSchema } from "../utils/validation";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const categorias = await prisma.categoria.findMany({ orderBy: { id: "asc" } });
    res.status(200).json(categorias);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Categoria");
    const categoria = await prisma.categoria.findUnique({ where: { id } });

    if (!categoria) {
      throw new ApiError(404, "Categoria não encontrada");
    }

    res.status(200).json(categoria);
  } catch (error) {
    next(error);
  }
});

router.post("/", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const parsed = categoriaCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const createData: Prisma.categoriaCreateInput = {
      nome: parsed.data.nome,
      ...(parsed.data.descricao !== undefined ? { descricao: parsed.data.descricao } : {}),
    };

    const created = await prisma.categoria.create({ data: createData });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Categoria");
    const parsed = categoriaUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.categoria.findUnique({ where: { id }, select: { id: true } });

    if (!current) {
      throw new ApiError(404, "Categoria não encontrada");
    }

    const updateData: Prisma.categoriaUpdateInput = {};

    if (parsed.data.nome !== undefined) {
      updateData.nome = parsed.data.nome;
    }

    if (parsed.data.descricao !== undefined) {
      updateData.descricao = parsed.data.descricao;
    }

    const updated = await prisma.categoria.update({ where: { id }, data: updateData });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Categoria");
    const current = await prisma.categoria.findUnique({ where: { id }, select: { id: true } });

    if (!current) {
      throw new ApiError(404, "Categoria não encontrada");
    }

    await prisma.categoria.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as categoriaRoutes };
