/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `locations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `masters` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `locations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `masters` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "masters" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "masters_slug_key" ON "masters"("slug");
