import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID, requireRole, verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { parsePositiveInt } from "../utils/request";

const router = Router();

router.use(verifyAccessToken, requireRole([ADMIN_ROLE_ID]));

router.get("/", async (req, res, next) => {
  try {
    const idsRaw = req.query.ids;

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

    const usuarios = await prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nome: true,
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

export { router as usuarioRoutes };