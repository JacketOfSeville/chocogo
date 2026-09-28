import webpush from "web-push";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID } from "../middleware/authMiddleware";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

let isConfigured = false;

function ensureConfigured(): void {
  if (isConfigured) {
    return;
  }

  webpush.setVapidDetails(getEnv("VAPID_SUBJECT"), getEnv("VAPID_PUBLIC_KEY"), getEnv("VAPID_PRIVATE_KEY"));
  isConfigured = true;
}

export function getVapidPublicKey(): string {
  return getEnv("VAPID_PUBLIC_KEY");
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
}

async function sendToSubscriptions(
  subscriptions: Array<{ id: number; endpoint: string; p256dh: string; auth: string }>,
  payload: PushNotificationPayload,
): Promise<void> {
  if (subscriptions.length === 0) {
    return;
  }

  ensureConfigured();

  const serializedPayload = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          serializedPayload,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;

        // endpoint expirado ou revogado pelo navegador; remove para evitar tentativas futuras
        if (statusCode === 404 || statusCode === 410) {
          await prisma.push_subscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
          return;
        }

        console.warn("Falha ao enviar push notification:", error);
      }
    }),
  );
}

export async function notifyUser(userId: number, payload: PushNotificationPayload): Promise<void> {
  const subscriptions = await prisma.push_subscription.findMany({ where: { id_usuario: userId } });
  await sendToSubscriptions(subscriptions, payload);
}

export async function notifyAdmins(payload: PushNotificationPayload): Promise<void> {
  const subscriptions = await prisma.push_subscription.findMany({
    where: { usuario: { id_tipo_usuario: ADMIN_ROLE_ID } },
  });
  await sendToSubscriptions(subscriptions, payload);
}
