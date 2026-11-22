-- AlterTable
ALTER TABLE "cafes" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cafes_slug_key" ON "cafes"("slug");
