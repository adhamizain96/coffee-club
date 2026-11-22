-- CreateEnum
CREATE TYPE "Region" AS ENUM ('CITY', 'NORTH', 'NORTHWEST', 'WEST', 'SOUTH');

-- AlterTable
ALTER TABLE "cafes" ADD COLUMN     "region" "Region";
