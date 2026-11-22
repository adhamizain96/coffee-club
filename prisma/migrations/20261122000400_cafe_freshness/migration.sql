-- CreateEnum
CREATE TYPE "CafeStatus" AS ENUM ('OPEN', 'TEMPORARILY_CLOSED', 'CLOSED');

-- AlterTable
ALTER TABLE "cafes" ADD COLUMN     "curator_visited_at" TIMESTAMP(3),
ADD COLUMN     "status" "CafeStatus" DEFAULT 'OPEN';
