import nodemailer from "nodemailer";
import { env, hasSmtpConfig } from "../config/env.js";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!hasSmtpConfig()) {
    throw new Error("Password reset email is unavailable until SMTP_HOST, SMTP_USER, and SMTP_PASS are configured.");
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Reset your Estatea password",
    text: `Use this link within 30 minutes to reset your password: ${resetUrl}`,
    html: `<p>Use this link within 30 minutes to reset your password:</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}

export async function sendContactMessage(input: { name: string; email: string; subject: string; message: string }): Promise<void> {
  if (!hasSmtpConfig() || !env.CONTACT_EMAIL) {
    throw new Error("Contact email is unavailable until SMTP settings and CONTACT_EMAIL are configured.");
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: env.CONTACT_EMAIL,
    replyTo: input.email,
    subject: `Estatea contact: ${input.subject}`,
    text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
  });
} 
