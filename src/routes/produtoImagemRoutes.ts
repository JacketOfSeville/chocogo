import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID, requireRole, verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { parsePositiveInt } from "../utils/request";
import {
  produtoImagemCreateSchema,
  produtoImagemUploadBodySchema,
  produtoImagemUpdateSchema,
} from "../utils/validation";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads/produtos");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${suffix}-${safeName}`);
  },
});

const upload = multer({ storage });

async function ensureProdutoExists(id_produto: number): Promise<void> {
  const produto = await prisma.produto.findUnique({ where: { id: id_produto }, select: { id: true } });

  if (!produto) {
    throw new ApiError(400, "id_produto deve existir");
  }
}

router.get("/", async (_req, res, next) => {
  try {
    const imagens = await prisma.produto_imagem.findMany({ orderBy: { id: "asc" } });
    res.status(200).json(imagens);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de ProdutoImagem");
    const imagem = await prisma.produto_imagem.findUnique({ where: { id } });

    if (!imagem) {
      throw new ApiError(404, "Imagem de produto não encontrada");
    }

    res.status(200).json(imagem);
  } catch (error) {
    next(error);
  }
});

router.post("/", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const parsed = produtoImagemCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    await ensureProdutoExists(parsed.data.id_produto);

    const created = await prisma.produto_imagem.create({
      data: {
        id_produto: parsed.data.id_produto,
        url: parsed.data.url,
        ordem: parsed.data.ordem,
        principal: parsed.data.principal ?? false,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.post(
  "/upload",
  verifyAccessToken,
  requireRole([ADMIN_ROLE_ID]),
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, "Arquivo de imagem é obrigatório no campo 'image'");
      }

      const parsedBody = produtoImagemUploadBodySchema.safeParse(req.body);

      if (!parsedBody.success) {
        await fs.unlink(req.file.path).catch(() => undefined);
        throw new ApiError(400, parsedBody.error.issues[0]?.message ?? "Corpo da requisição inválido");
      }

      await ensureProdutoExists(parsedBody.data.id_produto);

      const publicUrl = `/uploads/produtos/${req.file.filename}`;

      const created = await prisma.produto_imagem.create({
        data: {
          id_produto: parsedBody.data.id_produto,
          url: publicUrl,
          ordem: parsedBody.data.ordem,
          principal: parsedBody.data.principal ?? false,
        },
      });

      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

router.put("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de ProdutoImagem");
    const parsed = produtoImagemUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.produto_imagem.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Imagem de produto não encontrada");
    }

    if (parsed.data.id_produto !== undefined) {
      await ensureProdutoExists(parsed.data.id_produto);
    }

    const updated = await prisma.produto_imagem.update({
      where: { id },
      data: {
        ...(parsed.data.id_produto !== undefined ? { id_produto: parsed.data.id_produto } : {}),
        ...(parsed.data.url !== undefined ? { url: parsed.data.url } : {}),
        ...(parsed.data.ordem !== undefined ? { ordem: parsed.data.ordem } : {}),
        ...(parsed.data.principal !== undefined ? { principal: parsed.data.principal } : {}),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", verifyAccessToken, requireRole([ADMIN_ROLE_ID]), async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de ProdutoImagem");
    const current = await prisma.produto_imagem.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Imagem de produto não encontrada");
    }

    await prisma.produto_imagem.delete({ where: { id } });

    if (current.url.startsWith("/uploads/produtos/")) {
      const filename = path.basename(current.url);
      await fs.unlink(path.join(uploadDir, filename)).catch(() => undefined);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as produtoImagemRoutes };
