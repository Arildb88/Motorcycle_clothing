/*
  Warnings:

  - You are about to drop the `AuthProvider` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "AuthProvider_provider_providerUserId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AuthProvider";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubjectId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "scopes" TEXT NOT NULL DEFAULT '',
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "userId" TEXT,
    "redirectUri" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "homeLat" REAL,
    "homeLon" REAL,
    "units" TEXT NOT NULL DEFAULT 'celsius',
    "defaultRouteId" TEXT,
    "coldSensitivity" INTEGER NOT NULL DEFAULT 0,
    "heatSensitivity" INTEGER NOT NULL DEFAULT 0,
    "sweatTendency" INTEGER,
    "avatarUrl" TEXT,
    "defaultActivity" TEXT NOT NULL DEFAULT 'motorcycle',
    "showActivityChooserOnLaunch" BOOLEAN NOT NULL DEFAULT true,
    "interestedActivitiesJson" TEXT NOT NULL DEFAULT '["motorcycle"]',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserProfile" ("coldSensitivity", "defaultRouteId", "homeLat", "homeLon", "id", "sweatTendency", "units", "userId") SELECT "coldSensitivity", "defaultRouteId", "homeLat", "homeLon", "id", "sweatTendency", "units", "userId" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubjectId_key" ON "AuthIdentity"("provider", "providerSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_provider_providerAccountId_key" ON "ConnectedAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_key" ON "ConnectedAccount"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");
