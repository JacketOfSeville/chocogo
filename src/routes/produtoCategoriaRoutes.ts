import { Prisma } from "../../generated/prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID, requireRole, verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { parsePositiveInt } from "../utils/request";
import { produtoCategoriaCreateSchema, produtoCategoriaUpdateSchema } from "../utils/validation";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const itens = await prisma.produto_categoria.findMany({ orderBy: { id: "asc" } });
    res.status(200).json(itens);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de ProdutoCategoria");
    const item = await prisma.produto_categoria.findUnique({ where: { id } });

    if (!item) {
      throw new ApiError(404, "Relação produto_categoria não encontrada");
    }

    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

router.post("/", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const parsed = produtoCategoriaCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const [produto, categoria] = await Promise.all([
      prisma.produto.findUnique({ where: { id: parsed.data.id_produto }, select: { id: true } }),
      prisma.categoria.findUnique({ where: { id: parsed.data.id_categoria }, select: { id: true } }),
    ]);

    if (!produto || !categoria) {
      throw new ApiError(400, "id_produto e id_categoria devem existir");
    }

    const created = await prisma.produto_categoria.create({ data: parsed.data });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de ProdutoCategoria");
    const parsed = produtoCategoriaUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.produto_categoria.findUnique({ where: { id }, select: { id: true } });

    if (!current) {
      throw new ApiError(404, "Relação produto_categoria não encontrada");
    }

    if (parsed.data.id_produto !== undefined) {
      const produto = await prisma.produto.findUnique({
        where: { id: parsed.data.id_produto },
        select: { id: true },
      });

      if (!produto) {
        throw new ApiError(400, "id_produto deve existir");
      }
    }

    if (parsed.data.id_categoria !== undefined) {
      const categoria = await prisma.categoria.findUnique({
        where: { id: parsed.data.id_categoria },
        select: { id: true },
      });

      if (!categoria) {
        throw new ApiError(400, "id_categoria deve existir");
      }
    }

    const updateData: Prisma.produto_categoriaUncheckedUpdateInput = {};

    if (parsed.data.id_produto !== undefined) {
      updateData.id_produto = parsed.data.id_produto;
    }

    if (parsed.data.id_categoria !== undefined) {
      updateData.id_categoria = parsed.data.id_categoria;
    }

    const updated = await prisma.produto_categoria.update({ where: { id }, data: updateData });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de ProdutoCategoria");
    const current = await prisma.produto_categoria.findUnique({ where: { id }, select: { id: true } });

    if (!current) {
      throw new ApiError(404, "Relação produto_categoria não encontrada");
    }

    await prisma.produto_categoria.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as produtoCategoriaRoutes };
