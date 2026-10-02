/*
  Warnings:

  - You are about to drop the `ComfortSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RideFeedback` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ComfortSettings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Profile";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RideFeedback";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "homeLat" REAL,
    "homeLon" REAL,
    "units" TEXT NOT NULL DEFAULT 'celsius',
    "defaultRouteId" TEXT,
    "coldSensitivity" INTEGER NOT NULL DEFAULT 0,
    "sweatTendency" INTEGER,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MotorcycleProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'naked',
    "windProtection" TEXT NOT NULL DEFAULT 'low',
    CONSTRAINT "MotorcycleProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Garment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "primaryBodyZone" TEXT NOT NULL,
    "warmthTier" INTEGER NOT NULL DEFAULT 3,
    "windResistTier" INTEGER NOT NULL DEFAULT 2,
    "waterResistTier" INTEGER NOT NULL DEFAULT 1,
    "breathabilityTier" INTEGER NOT NULL DEFAULT 3,
    "brand" TEXT,
    "model" TEXT,
    "notes" TEXT,
    "activityTagsJson" TEXT NOT NULL DEFAULT '["motorcycle"]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Garment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Place_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL DEFAULT 'motorcycle',
    "routeId" TEXT,
    "departureAt" DATETIME NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "intensity" TEXT,
    "snapshotJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityPlan_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeatherSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeatherSnapshot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActivityPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'low',
    "confidenceScore" REAL,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "reasonsJson" TEXT NOT NULL DEFAULT '[]',
    "personalizationJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recommendation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActivityPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recommendationId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "garmentId" TEXT,
    "genericLabel" TEXT,
    CONSTRAINT "RecommendationItem_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "routeId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "durationMin" INTEGER,
    "wornGarmentIdsJson" TEXT NOT NULL DEFAULT '[]',
    "weatherSummaryJson" TEXT NOT NULL DEFAULT '{}',
    "recommendationJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActivityPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityLogId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "sweatLevel" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityFeedback_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BodyAreaFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedbackId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    CONSTRAINT "BodyAreaFeedback_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "ActivityFeedback" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonalOffset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "n" REAL NOT NULL DEFAULT 0,
    "meanResidual" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonalOffset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MotorcycleProfile_userId_key" ON "MotorcycleProfile"("userId");

-- CreateIndex
CREATE INDEX "Garment_userId_category_idx" ON "Garment"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherSnapshot_planId_key" ON "WeatherSnapshot"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_planId_key" ON "Recommendation"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_planId_key" ON "ActivityLog"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityFeedback_activityLogId_key" ON "ActivityFeedback"("activityLogId");

-- CreateIndex
CREATE UNIQUE INDEX "BodyAreaFeedback_feedbackId_zone_key" ON "BodyAreaFeedback"("feedbackId", "zone");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalOffset_userId_activityType_zone_key" ON "PersonalOffset"("userId", "activityType", "zone");
