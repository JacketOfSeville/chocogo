import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { canAccessUserResource, isAdmin, parsePositiveInt, requireUser } from "../utils/request";
import { enderecoCreateSchema, enderecoUpdateSchema } from "../utils/validation";

const router = Router();

router.use(verifyAccessToken);

router.get("/", async (req, res, next) => {
  try {
    const user = requireUser(req);

    const enderecos = await prisma.endereco.findMany({
      where: isAdmin(user.roleId) ? {} : { id_usuario: user.id },
      orderBy: { id: "asc" },
    });

    res.status(200).json(enderecos);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Endereço");
    const user = requireUser(req);

    const endereco = await prisma.endereco.findUnique({ where: { id } });

    if (!endereco) {
      throw new ApiError(404, "Endereço não encontrado");
    }

    if (!canAccessUserResource(user, endereco.id_usuario)) {
      throw new ApiError(403, "Sem permissão para acessar este endereço");
    }

    res.status(200).json(endereco);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const parsed = enderecoCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const targetUserId = parsed.data.id_usuario ?? user.id;

    if (!canAccessUserResource(user, targetUserId)) {
      throw new ApiError(403, "Sem permissão para criar endereço para outro usuário");
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: targetUserId }, select: { id: true } });

    if (!usuario) {
      throw new ApiError(400, "id_usuario deve existir");
    }

    const created = await prisma.endereco.create({
      data: {
        id_usuario: targetUserId,
        logradouro: parsed.data.logradouro,
        numero: parsed.data.numero,
        complemento: parsed.data.complemento ?? null,
        bairro: parsed.data.bairro,
        cidade: parsed.data.cidade,
        cep: parsed.data.cep,
        principal: parsed.data.principal ?? false,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Endereço");
    const user = requireUser(req);
    const parsed = enderecoUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.endereco.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Endereço não encontrado");
    }

    if (!canAccessUserResource(user, current.id_usuario)) {
      throw new ApiError(403, "Sem permissão para atualizar este endereço");
    }

    const targetUserId = parsed.data.id_usuario ?? current.id_usuario;

    if (!canAccessUserResource(user, targetUserId)) {
      throw new ApiError(403, "Sem permissão para mover endereço para outro usuário");
    }

    if (parsed.data.id_usuario !== undefined) {
      const usuario = await prisma.usuario.findUnique({ where: { id: parsed.data.id_usuario }, select: { id: true } });

      if (!usuario) {
        throw new ApiError(400, "id_usuario deve existir");
      }
    }

    const updated = await prisma.endereco.update({
      where: { id },
      data: {
        ...(parsed.data.id_usuario !== undefined ? { id_usuario: parsed.data.id_usuario } : {}),
        ...(parsed.data.logradouro !== undefined ? { logradouro: parsed.data.logradouro } : {}),
        ...(parsed.data.numero !== undefined ? { numero: parsed.data.numero } : {}),
        ...(parsed.data.complemento !== undefined ? { complemento: parsed.data.complemento } : {}),
        ...(parsed.data.bairro !== undefined ? { bairro: parsed.data.bairro } : {}),
        ...(parsed.data.cidade !== undefined ? { cidade: parsed.data.cidade } : {}),
        ...(parsed.data.cep !== undefined ? { cep: parsed.data.cep } : {}),
        ...(parsed.data.principal !== undefined ? { principal: parsed.data.principal } : {}),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Endereço");
    const user = requireUser(req);

    const current = await prisma.endereco.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Endereço não encontrado");
    }

    if (!canAccessUserResource(user, current.id_usuario)) {
      throw new ApiError(403, "Sem permissão para remover este endereço");
    }

    await prisma.endereco.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as enderecoRoutes };
