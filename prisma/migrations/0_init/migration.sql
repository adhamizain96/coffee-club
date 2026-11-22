-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('AMENITY', 'VIBE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "cafes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "image_url" TEXT NOT NULL,
    "owner_review" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitter_name" TEXT,
    "added_at" TIMESTAMP(3),

    CONSTRAINT "cafes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TagType" NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafe_tags" (
    "id" TEXT NOT NULL,
    "cafe_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "cafe_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "cafe_id" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "author_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cafe_submissions" (
    "id" TEXT NOT NULL,
    "cafe_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "normalized_address" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "why_you_like_it" VARCHAR(280),
    "suggested_tag_ids" TEXT[],
    "submitter_name" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "approved_cafe_id" TEXT,

    CONSTRAINT "cafe_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cafe_tags_cafe_id_tag_id_key" ON "cafe_tags"("cafe_id", "tag_id");

-- CreateIndex
CREATE INDEX "cafe_submissions_status_created_at_idx" ON "cafe_submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "cafe_submissions_normalized_address_idx" ON "cafe_submissions"("normalized_address");

-- AddForeignKey
ALTER TABLE "cafe_tags" ADD CONSTRAINT "cafe_tags_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafe_tags" ADD CONSTRAINT "cafe_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_cafe_id_fkey" FOREIGN KEY ("cafe_id") REFERENCES "cafes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cafe_submissions" ADD CONSTRAINT "cafe_submissions_approved_cafe_id_fkey" FOREIGN KEY ("approved_cafe_id") REFERENCES "cafes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
