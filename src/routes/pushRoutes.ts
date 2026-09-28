import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { verifyAccessToken } from "../middleware/authMiddleware";
import { getVapidPublicKey } from "../services/pushService";
import { ApiError } from "../utils/errors";
import { requireUser } from "../utils/request";
import { pushSubscriptionCreateSchema, pushUnsubscribeSchema } from "../utils/validation";

const router = Router();

router.get("/public-key", (_req, res) => {
  res.status(200).json({ publicKey: getVapidPublicKey() });
});

router.post("/subscribe", verifyAccessToken, async (req, res, next) => {
  try {
    const user = requireUser(req);
    const parsed = pushSubscriptionCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const subscription = await prisma.push_subscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        id_usuario: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
      update: {
        id_usuario: user.id,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
    });

    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

router.post("/unsubscribe", verifyAccessToken, async (req, res, next) => {
  try {
    const user = requireUser(req);
    const parsed = pushUnsubscribeSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Corpo da requisição inválido");
    }

    const subscription = await prisma.push_subscription.findUnique({ where: { endpoint: parsed.data.endpoint } });

    if (subscription && subscription.id_usuario === user.id) {
      await prisma.push_subscription.delete({ where: { id: subscription.id } });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as pushRoutes };
