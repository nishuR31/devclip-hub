import nodemailer from "nodemailer";
import { config } from "../config/env";

const transporter = nodemailer.createTransport({
  host: config.EMAIL_SMTP_HOST,
  port: config.EMAIL_SMTP_PORT,
  secure: config.EMAIL_SMTP_SECURE,
  auth: {
    user: config.EMAIL_SMTP_USER || config.EMAIL_FROM,
    pass: config.EMAIL_FROM_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!config.EMAIL_ENABLED) {
    console.log(
      `[EmailDisabled] Skipping email to ${opts.to} | subject: ${opts.subject}`,
    );
    return;
  }

  await transporter.sendMail({
    from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

// ── Templates ──────────────────────────────────────────────────────────────────

export function verificationEmailHtml(name: string, otp: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#6366f1">Verify your email</h2>
      <p>Hi ${name || "there"},</p>
      <p>Use the code below to verify your DevClipboard Hub account. It expires in 10 minutes.</p>
      <div style="background:#f4f4f5;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;font-family:monospace;color:#18181b">${otp}</span>
      </div>
      <p style="color:#71717a;font-size:13px">If you didn't create an account, you can safely ignore this email.</p>
    </div>`;
}

export function passwordResetEmailHtml(name: string, otp: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#6366f1">Reset your password</h2>
      <p>Hi ${name || "there"},</p>
      <p>Use the code below to reset your password. It expires in 10 minutes.</p>
      <div style="background:#f4f4f5;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;font-family:monospace;color:#18181b">${otp}</span>
      </div>
      <p style="color:#71717a;font-size:13px">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>`;
}

export function magicLinkEmailHtml(name: string, magicUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#6366f1">Your magic sign-in link</h2>
      <p>Hi ${name || "there"},</p>
      <p>Click the button below to sign in instantly. This link expires in 15 minutes.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${magicUrl}" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Sign in to DevClipboard</a>
      </div>
      <p style="color:#71717a;font-size:13px">Or copy this link: <a href="${magicUrl}">${magicUrl}</a></p>
      <p style="color:#71717a;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>`;
}

export function welcomeEmailHtml(name: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#6366f1">Welcome to DevClipboard Hub!</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your account is all set. You're on the <strong>Free plan</strong> — manage your clipboard, snippets and browser storage right from your browser.</p>
      <p>Upgrade any time at <a href="${config.FRONTEND_URL}/pricing">devclipboard.app/pricing</a> to unlock cloud sync, unlimited history, and more.</p>
      <p>Happy clipping!</p>
    </div>`;
}
