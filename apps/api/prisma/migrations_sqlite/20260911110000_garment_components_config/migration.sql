-- AlterTable
ALTER TABLE "Garment" ADD COLUMN "material" TEXT;
ALTER TABLE "Garment" ADD COLUMN "hasVentilation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Garment" ADD COLUMN "isHeated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GarmentComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "garmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT,
    "warmthDelta" INTEGER NOT NULL DEFAULT 0,
    "windResistDelta" INTEGER NOT NULL DEFAULT 0,
    "waterResistDelta" INTEGER NOT NULL DEFAULT 0,
    "breathabilityDelta" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GarmentComponent_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "Garment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GarmentComponent_garmentId_idx" ON "GarmentComponent"("garmentId");
