-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "is_defunct" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'Webhook';

-- CreateTable
CREATE TABLE "UnmatchedPayment" (
    "id" TEXT NOT NULL,
    "bank_reference" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "raw_bill_ref" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payer_phone" TEXT,
    "raw_payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "suggested_church_id" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "assigned_church_id" TEXT,
    "assigned_payment_id" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "notes" TEXT,
    "escalated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnmatchedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolutionPattern" (
    "id" TEXT NOT NULL,
    "raw_reference_pattern" TEXT NOT NULL,
    "normalized_reference" TEXT NOT NULL,
    "resolved_church_code" TEXT NOT NULL,
    "resolution_type" TEXT NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolutionPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WriteOff" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "resulting_defunct_flag" BOOLEAN NOT NULL DEFAULT false,
    "audit_log_id" TEXT,

    CONSTRAINT "WriteOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingPayment" (
    "id" TEXT NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "church_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "allocations_json" JSONB NOT NULL,
    "attachment_url" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "resulting_payment_id" TEXT,

    CONSTRAINT "PendingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedPayment_bank_reference_key" ON "UnmatchedPayment"("bank_reference");

-- CreateIndex
CREATE INDEX "UnmatchedPayment_status_created_at_idx" ON "UnmatchedPayment"("status", "created_at");

-- CreateIndex
CREATE INDEX "UnmatchedPayment_raw_bill_ref_idx" ON "UnmatchedPayment"("raw_bill_ref");

-- CreateIndex
CREATE INDEX "UnmatchedPayment_assigned_church_id_idx" ON "UnmatchedPayment"("assigned_church_id");

-- CreateIndex
CREATE INDEX "ResolutionPattern_normalized_reference_idx" ON "ResolutionPattern"("normalized_reference");

-- CreateIndex
CREATE INDEX "ResolutionPattern_is_active_confidence_score_idx" ON "ResolutionPattern"("is_active", "confidence_score");

-- CreateIndex
CREATE UNIQUE INDEX "ResolutionPattern_raw_reference_pattern_resolved_church_cod_key" ON "ResolutionPattern"("raw_reference_pattern", "resolved_church_code");

-- CreateIndex
CREATE INDEX "WriteOff_church_id_idx" ON "WriteOff"("church_id");

-- CreateIndex
CREATE INDEX "WriteOff_status_idx" ON "WriteOff"("status");

-- CreateIndex
CREATE INDEX "PendingPayment_status_idx" ON "PendingPayment"("status");

-- CreateIndex
CREATE INDEX "PendingPayment_church_id_idx" ON "PendingPayment"("church_id");

-- AddForeignKey
ALTER TABLE "UnmatchedPayment" ADD CONSTRAINT "UnmatchedPayment_suggested_church_id_fkey" FOREIGN KEY ("suggested_church_id") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmatchedPayment" ADD CONSTRAINT "UnmatchedPayment_assigned_church_id_fkey" FOREIGN KEY ("assigned_church_id") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmatchedPayment" ADD CONSTRAINT "UnmatchedPayment_assigned_payment_id_fkey" FOREIGN KEY ("assigned_payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriteOff" ADD CONSTRAINT "WriteOff_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingPayment" ADD CONSTRAINT "PendingPayment_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
