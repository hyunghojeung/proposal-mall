// 네이버 SMTP 어댑터. .env의 SMTP_HOST/PORT/USER/PASS를 사용.
// 네이버는 SSL(465) + 일반 비밀번호 또는 앱 비밀번호 인증.

import nodemailer, { type Transporter } from "nodemailer";
import type { EmailMessage, EmailSender } from "./types";

let cached: Transporter | null = null;

function getTransport(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
  return cached;
}

export const smtpEmailSender: EmailSender = {
  name: "smtp",

  async send(message: EmailMessage) {
    try {
      const info = await getTransport().sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER!,
        to: message.to,
        bcc: message.bcc,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return { ok: true, messageId: info.messageId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error("[email:smtp] send failed:", error);
      return { ok: false, error };
    }
  },
};
