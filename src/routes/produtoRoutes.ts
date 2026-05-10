import { Prisma } from "../../generated/prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID, requireRole, verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { produtoCreateSchema, produtoUpdateSchema } from "../utils/validation";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const produtos = await prisma.produto.findMany({
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(produtos);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, "id de Produto invalido");
    }

    const produto = await prisma.produto.findUnique({ where: { id } });

    if (!produto) {
      throw new ApiError(404, "Produto não encontrado");
    }

    res.status(200).json(produto);
  } catch (error) {
    next(error);
  }
});

router.post("/", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const parsedBody = produtoCreateSchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new ApiError(400, parsedBody.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const existingBySku = await prisma.produto.findFirst({
      where: {
        codigo_sku: parsedBody.data.codigo_sku,
      },
      select: {
        id: true,
      },
    });

    if (existingBySku) {
      throw new ApiError(409, "codigo_sku já está em uso");
    }

    const createData: Prisma.produtoCreateInput = {
      nome: parsedBody.data.nome,
      codigo_sku: parsedBody.data.codigo_sku,
      peso_gramas: parsedBody.data.peso_gramas,
      preco: new Prisma.Decimal(parsedBody.data.preco),
      ...(parsedBody.data.ativo !== undefined ? { ativo: parsedBody.data.ativo } : {}),
    };

    const produto = await prisma.produto.create({ data: createData });

    res.status(201).json(produto);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, "id de Produto invalido");
    }

    const parsedBody = produtoUpdateSchema.safeParse(req.body);

    if (!parsedBody.success) {
      throw new ApiError(400, parsedBody.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.produto.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      throw new ApiError(404, "Produto não encontrado");
    }

    if (parsedBody.data.codigo_sku) {
      const skuOwner = await prisma.produto.findFirst({
        where: {
          codigo_sku: parsedBody.data.codigo_sku,
          NOT: { id },
        },
        select: { id: true },
      });

      if (skuOwner) {
        throw new ApiError(409, "codigo_sku já está em uso");
      }
    }

    const updateData: Prisma.produtoUpdateInput = {};

    if (parsedBody.data.nome !== undefined) {
      updateData.nome = parsedBody.data.nome;
    }

    if (parsedBody.data.codigo_sku !== undefined) {
      updateData.codigo_sku = parsedBody.data.codigo_sku;
    }

    if (parsedBody.data.peso_gramas !== undefined) {
      updateData.peso_gramas = parsedBody.data.peso_gramas;
    }

    if (parsedBody.data.preco !== undefined) {
      updateData.preco = new Prisma.Decimal(parsedBody.data.preco);
    }

    if (parsedBody.data.ativo !== undefined) {
      updateData.ativo = parsedBody.data.ativo;
    }

    const produto = await prisma.produto.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json(produto);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, "id de Produto invalido");
    }

    const current = await prisma.produto.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      throw new ApiError(404, "Produto não encontrado");
    }

    await prisma.produto.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as produtoRoutes };
