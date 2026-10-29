-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('Monthly', 'Annual');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('M_Pesa', 'Bank_Transfer', 'Cash');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Paid', 'Pending', 'Overdue');

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chairman_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Church" (
    "id" TEXT NOT NULL,
    "church_code" TEXT NOT NULL,
    "church_name" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "treasurer_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "annual_fee" DECIMAL(65,30) NOT NULL DEFAULT 5000.00,
    "monthly_fee" DECIMAL(65,30) NOT NULL DEFAULT 500.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "amount_paid" DECIMAL(65,30) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "month_covered" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionalScore" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" TEXT NOT NULL,
    "compliance_pct" DECIMAL(65,30) NOT NULL,
    "timeliness_pct" DECIMAL(65,30) NOT NULL,
    "reporting_accuracy" DECIMAL(65,30) NOT NULL,
    "leadership_engagement" DECIMAL(65,30) NOT NULL,
    "final_score" DECIMAL(65,30) NOT NULL,
    "incentive_tier" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionalScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Church_church_code_key" ON "Church"("church_code");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transaction_id_key" ON "Payment"("transaction_id");

-- AddForeignKey
ALTER TABLE "Church" ADD CONSTRAINT "Church_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionalScore" ADD CONSTRAINT "RegionalScore_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
