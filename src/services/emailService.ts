import nodemailer, { type Transporter } from "nodemailer";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function isEmailDeliveryConfigured(): boolean {
  return ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"].every((name) => Boolean(process.env[name]));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(getEnv("SMTP_PORT"));

    if (!Number.isInteger(port) || port <= 0) {
      throw new Error("SMTP_PORT must be a valid port number");
    }

    transporter = nodemailer.createTransport({
      host: getEnv("SMTP_HOST"),
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: getEnv("SMTP_USER"),
        pass: getEnv("SMTP_PASSWORD"),
      },
    });
  }

  return transporter;
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");
  const resetUrl = `${frontendUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);

  await getTransporter().sendMail({
    from: getEnv("SMTP_FROM"),
    to: email,
    subject: "Redefinição de senha - ChocoGo",
    text: `Olá, ${name}. Para redefinir sua senha, acesse: ${resetUrl}\n\nO link expira em 30 minutos. Se você não solicitou a alteração, ignore este e-mail.`,
    html: `<p>Olá, ${safeName}.</p><p>Recebemos uma solicitação para redefinir a senha da sua conta ChocoGo.</p><p><a href="${resetUrl}">Criar uma nova senha</a></p><p>O link expira em 30 minutos. Se você não solicitou a alteração, ignore este e-mail.</p>`,
  });
}
