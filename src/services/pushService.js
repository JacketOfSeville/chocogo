import webpush from "web-push";
import { prisma } from "../../lib/prisma";
import { ADMIN_ROLE_ID } from "../middleware/authMiddleware";
function getEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
let isConfigured = false;
function ensureConfigured() {
    if (isConfigured) {
        return;
    }
    webpush.setVapidDetails(getEnv("VAPID_SUBJECT"), getEnv("VAPID_PUBLIC_KEY"), getEnv("VAPID_PRIVATE_KEY"));
    isConfigured = true;
}
export function getVapidPublicKey() {
    return getEnv("VAPID_PUBLIC_KEY");
}
async function sendToSubscriptions(subscriptions, payload) {
    if (subscriptions.length === 0) {
        return;
    }
    ensureConfigured();
    const serializedPayload = JSON.stringify(payload);
    await Promise.all(subscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification({
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            }, serializedPayload, { TTL: 60, urgency: "high" });
        }
        catch (error) {
            const statusCode = error.statusCode;
            // endpoint expirado ou revogado pelo navegador, remove para evitar tentativas futuras
            if (statusCode === 404 || statusCode === 410) {
                await prisma.push_subscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
                return;
            }
            console.warn("Falha ao enviar push notification:", error);
        }
    }));
}
export async function notifyUser(userId, payload) {
    const subscriptions = await prisma.push_subscription.findMany({ where: { id_usuario: userId } });
    await sendToSubscriptions(subscriptions, payload);
}
export async function notifyAdmins(payload) {
    const subscriptions = await prisma.push_subscription.findMany({
        where: { usuario: { id_tipo_usuario: ADMIN_ROLE_ID } },
    });
    await sendToSubscriptions(subscriptions, payload);
}
//# sourceMappingURL=pushService.js.map