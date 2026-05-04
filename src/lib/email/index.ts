import { smtpEmailSender } from "./smtp";
import { stubEmailSender } from "./stub";
import type { EmailSender } from "./types";

export function getEmailSender(): EmailSender {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return smtpEmailSender;
  }
  return stubEmailSender;
}

export type { EmailMessage, EmailSender } from "./types";
