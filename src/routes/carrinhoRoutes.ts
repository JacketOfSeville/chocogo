import { Prisma } from "../../generated/prisma/client";
import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";
import { canAccessUserResource, isAdmin, parsePositiveInt, requireUser } from "../utils/request";
import { carrinhoCheckoutSchema, carrinhoCreateSchema, carrinhoUpdateSchema } from "../utils/validation";

const router = Router();

router.use(verifyAccessToken);

router.get("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const carrinhos = await prisma.carrinho.findMany({
      where: isAdmin(user.roleId) ? {} : { id_usuario: user.id },
      orderBy: { id: "asc" },
    });

    res.status(200).json(carrinhos);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Carrinho");
    const user = requireUser(req);

    const carrinho = await prisma.carrinho.findUnique({ where: { id } });

    if (!carrinho) {
      throw new ApiError(404, "Carrinho não encontrado");
    }

    if (!canAccessUserResource(user, carrinho.id_usuario)) {
      throw new ApiError(403, "Sem permissão para acessar este carrinho");
    }

    res.status(200).json(carrinho);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = requireUser(req);
    const parsed = carrinhoCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const targetUserId = parsed.data.id_usuario ?? user.id;

    if (!canAccessUserResource(user, targetUserId)) {
      throw new ApiError(403, "Sem permissão para criar carrinho para outro usuário");
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: targetUserId }, select: { id: true } });

    if (!usuario) {
      throw new ApiError(400, "id_usuario deve existir");
    }

    const created = await prisma.carrinho.create({ data: { id_usuario: targetUserId } });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Carrinho");
    const user = requireUser(req);
    const parsed = carrinhoUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const current = await prisma.carrinho.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Carrinho não encontrado");
    }

    if (!canAccessUserResource(user, current.id_usuario)) {
      throw new ApiError(403, "Sem permissão para atualizar este carrinho");
    }

    if (parsed.data.id_usuario !== undefined) {
      if (!isAdmin(user.roleId)) {
        throw new ApiError(403, "Apenas admin pode alterar id_usuario");
      }

      const usuario = await prisma.usuario.findUnique({ where: { id: parsed.data.id_usuario }, select: { id: true } });

      if (!usuario) {
        throw new ApiError(400, "id_usuario deve existir");
      }
    }

    const updated = await prisma.carrinho.update({
      where: { id },
      data: parsed.data.id_usuario !== undefined ? { id_usuario: parsed.data.id_usuario } : {},
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Carrinho");
    const user = requireUser(req);

    const current = await prisma.carrinho.findUnique({ where: { id } });

    if (!current) {
      throw new ApiError(404, "Carrinho não encontrado");
    }

    if (!canAccessUserResource(user, current.id_usuario)) {
      throw new ApiError(403, "Sem permissão para remover este carrinho");
    }

    await prisma.carrinho.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/:id/checkout", async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id, "id de Carrinho");
    const user = requireUser(req);
    const parsed = carrinhoCheckoutSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const result = await prisma.$transaction(async (tx) => {
      const carrinho = await tx.carrinho.findUnique({ where: { id } });

      if (!carrinho) {
        throw new ApiError(404, "Carrinho não encontrado");
      }

      if (!canAccessUserResource(user, carrinho.id_usuario)) {
        throw new ApiError(403, "Sem permissão para finalizar este carrinho");
      }

      const [statusPedido, tipoEntrega] = await Promise.all([
        tx.status_pedido.findUnique({ where: { id: parsed.data.id_status_pedido }, select: { id: true } }),
        tx.tipo_entrega.findUnique({ where: { id: parsed.data.id_tipo_entrega }, select: { id: true } }),
      ]);

      if (!statusPedido) {
        throw new ApiError(400, "id_status_pedido deve existir");
      }

      if (!tipoEntrega) {
        throw new ApiError(400, "id_tipo_entrega deve existir");
      }

      if (parsed.data.id_endereco != null) {
        const endereco = await tx.endereco.findUnique({
          where: { id: parsed.data.id_endereco },
          select: { id: true, id_usuario: true },
        });

        if (!endereco) {
          throw new ApiError(400, "id_endereco deve existir");
        }

        if (endereco.id_usuario !== carrinho.id_usuario) {
          throw new ApiError(400, "id_endereco deve pertencer ao dono do carrinho");
        }
      }

      const itensCarrinho = await tx.carrinho_itens.findMany({
        where: { id_carrinho: id },
        orderBy: { id: "asc" },
      });

      if (itensCarrinho.length === 0) {
        throw new ApiError(400, "Carrinho sem itens para checkout");
      }

      const quantidadePorProduto = new Map<number, number>();

      for (const item of itensCarrinho) {
        const atual = quantidadePorProduto.get(item.id_produto) ?? 0;
        quantidadePorProduto.set(item.id_produto, atual + item.quantidade);
      }

      const produtoIds = Array.from(quantidadePorProduto.keys());
      const produtos = await tx.produto.findMany({
        where: { id: { in: produtoIds } },
        select: { id: true, preco: true, ativo: true },
      });

      if (produtos.length !== produtoIds.length) {
        throw new ApiError(400, "Há itens no carrinho com produto inexistente");
      }

      const precoPorProduto = new Map<number, Prisma.Decimal>();

      for (const produto of produtos) {
        if (!produto.ativo) {
          throw new ApiError(400, `Produto ${produto.id} está inativo`);
        }

        precoPorProduto.set(produto.id, produto.preco);
      }

      for (const [idProduto, quantidadeNecessaria] of quantidadePorProduto) {
        const estoques = await tx.estoque.findMany({
          where: { id_produto: idProduto },
          orderBy: { id: "asc" },
          select: { id: true, quantidade: true },
        });

        const quantidadeDisponivel = estoques.reduce((total, estoque) => total + estoque.quantidade, 0);

        if (quantidadeDisponivel < quantidadeNecessaria) {
          throw new ApiError(400, `Estoque insuficiente para o produto ${idProduto}`);
        }

        let restante = quantidadeNecessaria;

        for (const estoque of estoques) {
          if (restante <= 0) {
            break;
          }

          const decremento = Math.min(estoque.quantidade, restante);

          if (decremento > 0) {
            await tx.estoque.update({
              where: { id: estoque.id },
              data: {
                quantidade: estoque.quantidade - decremento,
                data_update: new Date(),
              },
            });
            restante -= decremento;
          }
        }
      }

      const valorProdutos = itensCarrinho.reduce((total, item) => {
        const preco = precoPorProduto.get(item.id_produto);

        if (!preco) {
          throw new ApiError(400, `Preço não encontrado para produto ${item.id_produto}`);
        }

        return total.plus(preco.mul(item.quantidade));
      }, new Prisma.Decimal(0));

      const valorFrete = new Prisma.Decimal(parsed.data.valor_frete);
      const valorTotal = valorProdutos.plus(valorFrete);

      const pedido = await tx.pedido.create({
        data: {
          id_usuario: carrinho.id_usuario,
          ...(parsed.data.id_endereco !== undefined ? { id_endereco: parsed.data.id_endereco } : {}),
          id_status_pedido: parsed.data.id_status_pedido,
          id_tipo_entrega: parsed.data.id_tipo_entrega,
          meio_pagamento: parsed.data.meio_pagamento,
          valor_total: valorTotal,
          valor_frete: valorFrete,
        },
      });

      const itensPedidoData: Prisma.pedido_itemUncheckedCreateInput[] = itensCarrinho.map((item) => {
        const preco = precoPorProduto.get(item.id_produto);

        if (!preco) {
          throw new ApiError(400, `Preço não encontrado para produto ${item.id_produto}`);
        }

        return {
          id_pedido: pedido.id,
          id_produto: item.id_produto,
          quantidade: item.quantidade,
          preco_momento: preco,
          subtotal: preco.mul(item.quantidade),
        };
      });

      await tx.pedido_item.createMany({ data: itensPedidoData });
      await tx.carrinho_itens.deleteMany({ where: { id_carrinho: id } });

      const itensPedido = await tx.pedido_item.findMany({
        where: { id_pedido: pedido.id },
        orderBy: { id: "asc" },
      });

      return {
        pedido,
        itens: itensPedido,
        resumo: {
          valor_produtos: valorProdutos,
          valor_frete: valorFrete,
          valor_total: valorTotal,
        },
      };
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export { router as carrinhoRoutes };
