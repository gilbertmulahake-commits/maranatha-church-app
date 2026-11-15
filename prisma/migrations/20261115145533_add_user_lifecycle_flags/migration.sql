-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requires_password_reset" BOOLEAN NOT NULL DEFAULT false;
