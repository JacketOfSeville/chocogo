export declare function getVapidPublicKey(): string;
export interface PushNotificationPayload {
    title: string;
    body: string;
    url?: string;
}
export declare function notifyUser(userId: number, payload: PushNotificationPayload): Promise<void>;
export declare function notifyAdmins(payload: PushNotificationPayload): Promise<void>;
//# sourceMappingURL=pushService.d.ts.map