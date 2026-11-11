-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('Monthly', 'Annual');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('M_Pesa', 'Bank_Transfer', 'Cash');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Paid', 'Pending', 'Overdue');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('NATIONAL_TREASURER', 'NATIONAL_OVERSEER', 'REGIONAL_CHAIRMAN', 'REGIONAL_TREASURER', 'LOCAL_PASTOR', 'CHURCH_TREASURER');

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
    "pastor_name" TEXT NOT NULL DEFAULT '',
    "pastor_phone" TEXT NOT NULL DEFAULT '',
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
    "billing_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "allocation_type" "PaymentType" NOT NULL,
    "billing_year" INTEGER NOT NULL,
    "billing_month" INTEGER,
    "amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CHURCH_TREASURER',
    "region_id" TEXT,
    "church_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Sent',
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Church_church_code_key" ON "Church"("church_code");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transaction_id_key" ON "Payment"("transaction_id");

-- CreateIndex
CREATE INDEX "PaymentAllocation_payment_id_idx" ON "PaymentAllocation"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Church" ADD CONSTRAINT "Church_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionalScore" ADD CONSTRAINT "RegionalScore_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

