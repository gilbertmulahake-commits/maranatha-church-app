-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('Active', 'Matched', 'Unmatched', 'Expired', 'Abandoned');

-- CreateEnum
CREATE TYPE "PaymentIntentChannel" AS ENUM ('Manual', 'KCB_Buni', 'Equity_Jenga');

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "channel" "PaymentIntentChannel" NOT NULL DEFAULT 'Manual',
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'Active',
    "provider_request_id" TEXT,
    "provider_receipt" TEXT,
    "provider_result_code" TEXT,
    "raw_callback" JSONB,
    "matched_payment_id" TEXT,
    "matched_unmatched_id" TEXT,
    "matched_at" TIMESTAMP(3),
    "raw_bill_ref_entered" TEXT,
    "created_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "abandoned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_provider_receipt_key" ON "PaymentIntent"("provider_receipt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_matched_payment_id_key" ON "PaymentIntent"("matched_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_matched_unmatched_id_key" ON "PaymentIntent"("matched_unmatched_id");

-- CreateIndex
CREATE INDEX "PaymentIntent_church_id_status_idx" ON "PaymentIntent"("church_id", "status");

-- CreateIndex
CREATE INDEX "PaymentIntent_expires_at_idx" ON "PaymentIntent"("expires_at");

-- CreateIndex
CREATE INDEX "PaymentIntent_channel_status_idx" ON "PaymentIntent"("channel", "status");

-- CreateIndex
CREATE INDEX "PaymentIntent_provider_request_id_idx" ON "PaymentIntent"("provider_request_id");

-- CreateIndex
CREATE INDEX "Payment_church_id_created_at_idx" ON "Payment"("church_id", "created_at");

-- CreateIndex
CREATE INDEX "UnmatchedPayment_amount_created_at_idx" ON "UnmatchedPayment"("amount", "created_at");

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
