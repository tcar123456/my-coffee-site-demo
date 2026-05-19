-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentFailReason" TEXT,
ADD COLUMN     "paymentFailedAt" TIMESTAMP(3),
ADD COLUMN     "paymentRequestedAt" TIMESTAMP(3),
ADD COLUMN     "paymentTradeNo" TEXT;
