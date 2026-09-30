import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID, requireRole, verifyAccessToken } from "../middleware/authMiddleware";
import { ApiError } from "../utils/errors";

const router = Router();
const ALLOWED_PERIODS = [7, 30, 90, 365];

router.use(verifyAccessToken, requireRole([ADMIN_ROLE_ID]));

router.get("/pedidos", async (req, res, next) => {
  try {
    const daysRaw = req.query.days ?? "30";
    const days = typeof daysRaw === "string" ? Number(daysRaw) : Number.NaN;

    if (!ALLOWED_PERIODS.includes(days)) {
      throw new ApiError(400, "Período inválido. Use 7, 30, 90 ou 365 dias");
    }

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - days + 1);

    const pedidos = await prisma.pedido.findMany({
      where: { data_pedido: { gte: startDate } },
      orderBy: { data_pedido: "asc" },
      select: {
        id: true,
        data_pedido: true,
        id_status_pedido: true,
        id_tipo_entrega: true,
        valor_total: true,
        status_pedido: { select: { descricao: true } },
        itens: {
          select: {
            id_produto: true,
            quantidade: true,
            subtotal: true,
            produto: { select: { nome: true } },
          },
        },
      },
    });

    const salesByDate = new Map<string, { orders: number; revenue: number }>();
    const statusCounts = new Map<number, { label: string; count: number }>();
    const productSales = new Map<number, { name: string; quantity: number; revenue: number }>();
    let revenue = 0;
    let revenueOrderCount = 0;
    let canceledOrders = 0;
    let deliveryOrders = 0;
    let pickupOrders = 0;

    for (const pedido of pedidos) {
      const status = statusCounts.get(pedido.id_status_pedido) ?? {
        label: pedido.status_pedido.descricao,
        count: 0,
      };
      status.count += 1;
      statusCounts.set(pedido.id_status_pedido, status);

      if (pedido.id_tipo_entrega === 1) deliveryOrders += 1;
      if (pedido.id_tipo_entrega === 2) pickupOrders += 1;

      if (pedido.id_status_pedido === 5) {
        canceledOrders += 1;
        continue;
      }

      const orderRevenue = Number(pedido.valor_total);
      const dateKey = pedido.data_pedido.toISOString().slice(0, 10);
      const daily = salesByDate.get(dateKey) ?? { orders: 0, revenue: 0 };
      daily.orders += 1;
      daily.revenue += orderRevenue;
      salesByDate.set(dateKey, daily);
      revenue += orderRevenue;
      revenueOrderCount += 1;

      for (const item of pedido.itens) {
        const product = productSales.get(item.id_produto) ?? {
          name: item.produto.nome,
          quantity: 0,
          revenue: 0,
        };
        product.quantity += item.quantidade;
        product.revenue += Number(item.subtotal);
        productSales.set(item.id_produto, product);
      }
    }

    const salesTimeline = Array.from({ length: days }, (_, index) => {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      const daily = salesByDate.get(dateKey);

      return {
        date: dateKey,
        orders: daily?.orders ?? 0,
        revenue: daily?.revenue ?? 0,
      };
    });

    res.status(200).json({
      periodDays: days,
      summary: {
        orderCount: pedidos.length,
        revenue,
        averageTicket: revenueOrderCount > 0 ? revenue / revenueOrderCount : 0,
        canceledOrders,
        deliveryOrders,
        pickupOrders,
      },
      salesTimeline,
      ordersByStatus: [...statusCounts.entries()].map(([id, status]) => ({ id, ...status })),
      topProducts: [...productSales.entries()]
        .map(([id, product]) => ({ id, ...product }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8),
    });
  } catch (error) {
    next(error);
  }
});

export { router as relatorioRoutes };