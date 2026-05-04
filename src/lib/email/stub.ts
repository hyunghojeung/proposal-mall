import type { EmailMessage, EmailSender } from "./types";

// SMTP가 셋업되지 않은 환경에서 메일을 콘솔에 로그만 남기는 어댑터.
// 결제 흐름이 메일 발송 실패로 막히지 않게 하기 위함.
export const stubEmailSender: EmailSender = {
  name: "stub",

  async send(message: EmailMessage) {
    const id = `STUB-${Date.now()}`;
    console.log(
      `[email:stub] to=${Array.isArray(message.to) ? message.to.join(",") : message.to} subject="${message.subject}" id=${id}`,
    );
    return { ok: true, messageId: id };
  },
};
