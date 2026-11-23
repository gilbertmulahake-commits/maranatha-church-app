-- CreateTable
CREATE TABLE "ChurchDeletionRequest" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "resulted_in_deletion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChurchDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChurchDeletionRequest_church_id_idx" ON "ChurchDeletionRequest"("church_id");

-- CreateIndex
CREATE INDEX "ChurchDeletionRequest_status_idx" ON "ChurchDeletionRequest"("status");

-- CreateIndex
CREATE INDEX "ChurchDeletionRequest_proposed_by_idx" ON "ChurchDeletionRequest"("proposed_by");

-- CreateIndex
CREATE INDEX "ChurchDeletionRequest_status_proposed_at_idx" ON "ChurchDeletionRequest"("status", "proposed_at");

-- AddForeignKey
ALTER TABLE "ChurchDeletionRequest" ADD CONSTRAINT "ChurchDeletionRequest_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
