-- AlterTable
ALTER TABLE "cafes" ADD COLUMN     "hours" JSONB,
ADD COLUMN     "hours_checked_at" TIMESTAMP(3),
ADD COLUMN     "hours_source_url" TEXT,
ADD COLUMN     "website" TEXT;
