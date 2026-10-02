-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuthProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "homeLat" REAL,
    "homeLon" REAL,
    "units" TEXT NOT NULL DEFAULT 'celsius',
    "defaultRouteId" TEXT,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComfortSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "glovesBelowC" REAL NOT NULL DEFAULT 10,
    "extraJacketLayerBelowC" REAL NOT NULL DEFAULT 12,
    "extraPantsLayerBelowC" REAL NOT NULL DEFAULT 8,
    "woolBaseBelowC" REAL NOT NULL DEFAULT 5,
    "rainProbThreshold" REAL NOT NULL DEFAULT 40,
    "windChillSensitivity" TEXT NOT NULL DEFAULT 'medium',
    "personalColdBiasC" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "ComfortSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefaultCommute" BOOLEAN NOT NULL DEFAULT false,
    "startLat" REAL NOT NULL,
    "startLon" REAL NOT NULL,
    "startLabel" TEXT,
    "endLat" REAL NOT NULL,
    "endLon" REAL NOT NULL,
    "endLabel" TEXT,
    "waypointsJson" TEXT NOT NULL DEFAULT '[]',
    "typicalDurationMin" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Route_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RideFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "routeId" TEXT,
    "departureAt" DATETIME NOT NULL,
    "weatherSnapshotJson" TEXT NOT NULL,
    "recommendationJson" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "wornItemsJson" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RideFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RideFeedback_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeatherCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthProvider_provider_providerUserId_key" ON "AuthProvider"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ComfortSettings_userId_key" ON "ComfortSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherCache_cacheKey_key" ON "WeatherCache"("cacheKey");
