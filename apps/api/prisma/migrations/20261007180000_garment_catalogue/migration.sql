-- CreateTable
CREATE TABLE "GarmentCatalogueEntry" (
    "id" TEXT NOT NULL,
    "brandKey" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "activityScope" TEXT NOT NULL,
    "heated" BOOLEAN NOT NULL,
    "linerKey" TEXT NOT NULL,
    "materialKey" TEXT NOT NULL,
    "brandLabel" TEXT NOT NULL,
    "modelLabel" TEXT NOT NULL,
    "warmth1" INTEGER NOT NULL DEFAULT 0,
    "warmth2" INTEGER NOT NULL DEFAULT 0,
    "warmth3" INTEGER NOT NULL DEFAULT 0,
    "warmth4" INTEGER NOT NULL DEFAULT 0,
    "warmth5" INTEGER NOT NULL DEFAULT 0,
    "wind1" INTEGER NOT NULL DEFAULT 0,
    "wind2" INTEGER NOT NULL DEFAULT 0,
    "wind3" INTEGER NOT NULL DEFAULT 0,
    "wind4" INTEGER NOT NULL DEFAULT 0,
    "wind5" INTEGER NOT NULL DEFAULT 0,
    "water1" INTEGER NOT NULL DEFAULT 0,
    "water2" INTEGER NOT NULL DEFAULT 0,
    "water3" INTEGER NOT NULL DEFAULT 0,
    "water4" INTEGER NOT NULL DEFAULT 0,
    "water5" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GarmentCatalogueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "garment_catalogue_identity_key" ON "GarmentCatalogueEntry"("brandKey", "modelKey", "category", "activityScope", "heated", "linerKey", "materialKey");

-- CreateIndex
CREATE INDEX "GarmentCatalogueEntry_brandKey_category_idx" ON "GarmentCatalogueEntry"("brandKey", "category");
