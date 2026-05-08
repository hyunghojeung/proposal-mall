-- AlterTable: 주문에 결제수단(paymentMethod) 컬럼 추가
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'TRANSFER';
