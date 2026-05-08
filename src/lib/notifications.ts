// 결제 완료 시:
//   1) Dropbox 파일 요청 URL 생성 → order.fileLink 저장
//   2) 고객에게 안내 메일 (주문 요약 + Dropbox 링크 + 대안 이메일 안내)
//   3) 운영자(blackcopy2@naver.com)에게 BCC 사본
//
// 모든 단계는 best-effort. 실패해도 결제 자체는 이미 확정되어 있으므로
// 에러를 throw 하지 않고 로그만 남긴다.

import type { Order, OrderItem } from "@prisma/client";
import { prisma } from "./prisma";
import { createOrderFileRequest } from "./dropbox";
import { getEmailSender } from "./email";
import { DELIVERY_LABELS } from "./pricing";

type OrderWithItems = Order & { items: OrderItem[] };

export async function sendOrderConfirmation(order: OrderWithItems): Promise<void> {
  // 이미 fileLink + 이메일 발송이 완료된 주문이면 skip (멱등성)
  if (order.fileLink) {
    return;
  }

  let fileLink: string | null = null;
  try {
    const fileReq = await createOrderFileRequest({
      orderSerial: order.serial,
      customerName: order.customerName,
    });
    fileLink = fileReq.url;
    await prisma.order.update({
      where: { id: order.id },
      data: { fileLink },
    });
  } catch (err) {
    console.error(`[notifications] dropbox file request failed for ${order.serial}:`, err);
    // fileLink 없이도 메일은 발송 (수동 안내)
  }

  try {
    const sender = getEmailSender();
    const html = renderOrderConfirmationHtml({ order, fileLink });
    const result = await sender.send({
      to: order.customerEmail,
      bcc: process.env.SMTP_FROM ?? "blackcopy2@naver.com",
      subject: `[제안서박스몰] 주문 ${order.serial} 결제 완료 안내`,
      html,
      text: renderOrderConfirmationText({ order, fileLink }),
    });
    if (!result.ok) {
      console.error(
        `[notifications] email send failed for ${order.serial}: ${result.error}`,
      );
    }
  } catch (err) {
    console.error(`[notifications] email orchestration failed for ${order.serial}:`, err);
  }
}

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

function renderOrderConfirmationText({
  order,
  fileLink,
}: {
  order: OrderWithItems;
  fileLink: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`[제안서박스몰] 주문 ${order.serial} 결제 완료 안내`);
  lines.push("");
  lines.push(`${order.customerName}님, 안녕하세요.`);
  lines.push("제안서박스몰에서 주문해 주셔서 감사합니다.");
  lines.push("");
  lines.push(`▶ 주문번호: ${order.serial}`);
  lines.push(`▶ 결제 금액: ${formatWon(order.totalAmount)}`);
  lines.push("");
  lines.push("▶ 파일 업로드");
  if (fileLink) {
    lines.push(`아래 링크에서 인쇄용 파일을 업로드해 주세요:`);
    lines.push(fileLink);
  } else {
    lines.push("blackcopy2@naver.com 으로 인쇄용 파일을 첨부해 주세요.");
    lines.push("(Dropbox 링크는 수동으로 안내드릴 예정입니다.)");
  }
  lines.push("");
  lines.push("▶ 주문 상품");
  for (const it of order.items) {
    const opts =
      it.optionsJson && typeof it.optionsJson === "object"
        ? Object.entries(it.optionsJson as Record<string, string>)
            .map(([k, v]) => `${k}:${v}`)
            .join(", ")
        : "";
    const page = it.pageCount ? ` ${it.pageCount}쪽` : "";
    lines.push(
      `- ${it.productName} (${opts}${page}) × ${it.quantity}  ${formatWon(it.subtotal)}`,
    );
  }
  lines.push("");
  lines.push(
    `▶ 수령: ${DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}`,
  );
  if (order.shippingAddress) lines.push(`주소: ${order.shippingAddress}`);
  lines.push("");
  lines.push("▶ 제작 일정: 통상 2~3 영업일 (수량/옵션에 따라 최대 5영업일)");
  lines.push("");
  lines.push("문의: blackcopy2@naver.com");
  return lines.join("\n");
}

function renderOrderConfirmationHtml({
  order,
  fileLink,
}: {
  order: OrderWithItems;
  fileLink: string | null;
}): string {
  const itemsHtml = order.items
    .map((it) => {
      const opts =
        it.optionsJson && typeof it.optionsJson === "object"
          ? Object.entries(it.optionsJson as Record<string, string>)
              .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`)
              .join(" · ")
          : "";
      const page = it.pageCount ? ` · ${it.pageCount}쪽` : "";
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #E5E5E5;">
            <div style="font-weight:700;color:#1A1A1A;">${escapeHtml(it.productName)}</div>
            <div style="font-size:12px;color:#888;margin-top:2px;">${opts}${page} · ${it.quantity}개</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #E5E5E5;text-align:right;font-weight:700;color:#1A1A1A;white-space:nowrap;">${formatWon(it.subtotal)}</td>
        </tr>`;
    })
    .join("");

  const fileBlock = fileLink
    ? `
      <p style="margin:0 0 12px;font-size:13px;color:#1A1A1A;">아래 링크에서 인쇄용 파일을 업로드해 주세요:</p>
      <a href="${escapeAttr(fileLink)}" style="display:inline-block;background:#E8481A;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:6px;font-size:14px;">파일 업로드 하기</a>
      <p style="margin:14px 0 0;font-size:11px;color:#888;">또는 blackcopy2@naver.com 으로 첨부해 보내주셔도 됩니다.</p>`
    : `
      <p style="margin:0;font-size:13px;color:#1A1A1A;">blackcopy2@naver.com 으로 인쇄용 파일을 첨부해 주세요. Dropbox 링크는 별도로 안내드릴 예정입니다.</p>`;

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>주문 ${escapeHtml(order.serial)} 결제 완료</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#E8481A;padding:24px 32px;">
          <div style="font-size:20px;font-weight:900;color:#fff;font-style:italic;">제안서박스몰</div>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 6px;font-size:20px;font-weight:900;color:#1A1A1A;">결제가 완료되었습니다</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#888;">${escapeHtml(order.customerName)}님, 주문해 주셔서 감사합니다.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E5E5;border-radius:6px;margin-bottom:24px;">
            <tr><td style="padding:14px 18px;border-bottom:1px solid #E5E5E5;font-size:13px;color:#888;">주문번호</td>
                <td style="padding:14px 18px;border-bottom:1px solid #E5E5E5;text-align:right;font-size:14px;font-weight:700;color:#1A1A1A;">${escapeHtml(order.serial)}</td></tr>
            <tr><td style="padding:14px 18px;font-size:13px;color:#888;">결제 금액</td>
                <td style="padding:14px 18px;text-align:right;font-size:18px;font-weight:900;color:#E8481A;">${formatWon(order.totalAmount)}</td></tr>
          </table>

          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1A1A1A;">파일 업로드</h2>
          <div style="background:#FFF1EC;border:1px solid #E8481A;border-radius:6px;padding:18px;margin-bottom:24px;">
            ${fileBlock}
          </div>

          <h2 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1A1A1A;">주문 상품</h2>
          <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>

          <h2 style="margin:24px 0 8px;font-size:14px;font-weight:700;color:#1A1A1A;">수령 정보</h2>
          <p style="margin:0;font-size:13px;color:#1A1A1A;line-height:1.7;">
            ${DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}${
              order.shippingAddress
                ? `<br><span style="color:#888;">${escapeHtml(order.shippingAddress)}</span>`
                : ""
            }
          </p>

          <p style="margin:24px 0 0;font-size:12px;color:#888;line-height:1.7;">
            제작 일정은 통상 2~3 영업일이며, 수량과 옵션에 따라 최대 5영업일이 소요될 수 있습니다.<br>
            문의: <a href="mailto:blackcopy2@naver.com" style="color:#E8481A;">blackcopy2@naver.com</a>
          </p>
        </td></tr>

        <tr><td style="background:#F5F5F5;padding:18px 32px;text-align:center;font-size:11px;color:#AAA;">
          © 블랙카피 · 제안서박스몰 · proposal.blackcopy.co.kr
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
