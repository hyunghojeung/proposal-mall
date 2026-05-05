-- AlterTable: 상품에 contentBlocks(JSON) 컬럼 추가
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "contentBlocks" JSONB NOT NULL DEFAULT '[]';
