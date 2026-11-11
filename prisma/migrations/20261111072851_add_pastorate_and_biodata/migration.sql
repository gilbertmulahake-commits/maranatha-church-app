-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "membership_count" INTEGER,
ADD COLUMN     "pastorate_id" TEXT,
ADD COLUMN     "physical_address" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profile_photo_url" TEXT;

-- CreateTable
CREATE TABLE "Pastorate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "overseer_name" TEXT,
    "contact_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pastorate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pastorate" ADD CONSTRAINT "Pastorate_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Church" ADD CONSTRAINT "Church_pastorate_id_fkey" FOREIGN KEY ("pastorate_id") REFERENCES "Pastorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
