import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: env.MAIL_SERVER,
    port: env.MAIL_PORT,
    secure: env.MAIL_USE_SSL,
    requireTLS: env.MAIL_USE_TLS && !env.MAIL_USE_SSL,
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
    auth: {
      user: env.MAIL_USERNAME,
      pass: env.MAIL_PASSWORD,
    },
  });

  return cachedTransporter;
}

interface MailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendMail({ to, subject, html, text }: MailParams): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: { name: env.MAIL_FROM_NAME, address: env.MAIL_FROM },
    to,
    subject,
    text,
    html,
  });
}

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f5f6f8; padding:32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <tr>
        <td>
          <h1 style="margin:0 0 16px 0; color:#111827; font-size:20px;">${title}</h1>
          ${bodyHtml}
          <p style="margin:32px 0 0 0; color:#6b7280; font-size:12px;">If you did not request this email, you can safely ignore it.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const link = `${env.FRONTEND_PUBLIC_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "Verify your email";
  const html = wrapHtml(
    "Welcome! Please verify your email",
    `<p style="color:#374151; line-height:1.5;">Tap the button below to verify your email address and activate your account. This link expires in ${env.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes.</p>
     <p style="margin:24px 0;">
       <a href="${link}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">Verify email</a>
     </p>
     <p style="color:#6b7280; font-size:13px; word-break:break-all;">Or paste this link into your browser:<br />${link}</p>`
  );
  const text = `Verify your email by visiting: ${link}`;
  await sendMail({ to, subject, html, text });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const link = `${env.FRONTEND_PUBLIC_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "Reset your password";
  const html = wrapHtml(
    "Reset your password",
    `<p style="color:#374151; line-height:1.5;">We received a request to reset your password. Tap the button below to choose a new one. This link expires in ${env.PASSWORD_RESET_EXPIRE_MINUTES} minutes.</p>
     <p style="margin:24px 0;">
       <a href="${link}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600;">Reset password</a>
     </p>
     <p style="color:#6b7280; font-size:13px; word-break:break-all;">Or paste this link into your browser:<br />${link}</p>`
  );
  const text = `Reset your password by visiting: ${link}`;
  await sendMail({ to, subject, html, text });
}
