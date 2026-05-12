/**
 * 상품 대표 이미지 업로드 스크립트
 *
 * 사용법:
 *   npx tsx scripts/set-product-images.ts <흰색박스.jpg> <빨간박스.jpg>
 *
 * 예:
 *   npx tsx scripts/set-product-images.ts white-box.png red-box.jpg
 *
 * - 두 이미지를 Dropbox에 업로드합니다.
 * - DB에서 CARRIER_BOX 카테고리 상품 중
 *   첫 번째(표준) → 흰색 박스 이미지
 *   두 번째(커스텀) → 빨간 박스 이미지
 *   로 thumbnail / images 를 업데이트합니다.
 */

import { readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { uploadProductImage } from "../src/lib/dropbox";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

function mimeOf(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png")  return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif")  return "image/gif";
  return "image/jpeg";
}

async function upload(filePath: string): Promise<string> {
  const buffer   = readFileSync(filePath);
  const filename = path.basename(filePath);
  const mimeType = mimeOf(filePath);
  console.log(`  ⬆  Uploading "${filename}" (${(buffer.byteLength / 1024).toFixed(0)} KB) …`);
  const url = await uploadProductImage({ filename, buffer, mimeType });
  console.log(`  ✔  Done → ${url}\n`);
  return url;
}

async function main() {
  const [, , img1Path, img2Path] = process.argv;

  if (!img1Path || !img2Path) {
    console.error(
      "사용법: npx tsx scripts/set-product-images.ts <흰색박스.jpg> <빨간박스.jpg>",
    );
    process.exit(1);
  }

  /* ── 1. Dropbox 업로드 ── */
  console.log("\n[1/3] 이미지를 Dropbox에 업로드합니다…\n");
  const url1 = await upload(img1Path); // 흰색 박스 → 표준
  const url2 = await upload(img2Path); // 빨간 박스 → 커스텀

  /* ── 2. DB에서 CARRIER_BOX 상품 조회 ── */
  console.log("[2/3] CARRIER_BOX 상품을 조회합니다…");
  const products = await prisma.product.findMany({
    where:   { category: "CARRIER_BOX" },
    orderBy: { sortOrder: "asc" },
    take:    2,
  });

  if (products.length === 0) {
    console.error("  ✘  CARRIER_BOX 상품이 없습니다. 관리자에서 먼저 상품을 등록하세요.");
    await prisma.$disconnect();
    process.exit(1);
  }

  /* ── 3. 썸네일 업데이트 ── */
  console.log("\n[3/3] 상품 썸네일을 업데이트합니다…\n");

  if (products[0]) {
    await prisma.product.update({
      where: { id: products[0].id },
      data:  { thumbnail: url1, images: [url1] },
    });
    console.log(`  ✔  [${products[0].id}] "${products[0].name}" → 흰색 박스 이미지`);
  }

  if (products[1]) {
    await prisma.product.update({
      where: { id: products[1].id },
      data:  { thumbnail: url2, images: [url2] },
    });
    console.log(`  ✔  [${products[1].id}] "${products[1].name}" → 빨간 박스 이미지`);
  } else {
    console.log("  ℹ  두 번째 CARRIER_BOX 상품이 없어 첫 번째만 업데이트했습니다.");
  }

  await prisma.$disconnect();
  console.log("\n✅ 완료! 사이트에서 상품 이미지를 확인하세요.");
}

main().catch((err) => {
  console.error("\n✘ 오류:", err.message ?? err);
  prisma.$disconnect();
  process.exit(1);
});
