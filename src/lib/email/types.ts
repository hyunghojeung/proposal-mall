export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  bcc?: string | string[];
}

export interface EmailSender {
  name: string;
  send(message: EmailMessage): Promise<{ ok: boolean; messageId?: string; error?: string }>;
}
