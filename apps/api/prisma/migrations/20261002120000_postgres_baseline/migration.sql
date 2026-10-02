-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubjectId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeLat" DOUBLE PRECISION,
    "homeLon" DOUBLE PRECISION,
    "units" TEXT NOT NULL DEFAULT 'celsius',
    "distanceUnit" TEXT NOT NULL DEFAULT 'kilometer',
    "speedUnit" TEXT NOT NULL DEFAULT 'kmh',
    "windSpeedUnit" TEXT NOT NULL DEFAULT 'ms',
    "preferredLanguage" TEXT,
    "defaultRouteId" TEXT,
    "coldSensitivity" INTEGER NOT NULL DEFAULT 0,
    "heatSensitivity" INTEGER NOT NULL DEFAULT 0,
    "sweatTendency" INTEGER,
    "avatarUrl" TEXT,
    "defaultActivity" TEXT NOT NULL DEFAULT 'motorcycle',
    "showActivityChooserOnLaunch" BOOLEAN NOT NULL DEFAULT true,
    "interestedActivitiesJson" TEXT NOT NULL DEFAULT '["motorcycle"]',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotorcycleProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'naked',
    "windProtection" TEXT NOT NULL DEFAULT 'low',

    CONSTRAINT "MotorcycleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "layer" TEXT NOT NULL,
    "primaryBodyZone" TEXT NOT NULL,
    "warmthTier" INTEGER NOT NULL DEFAULT 3,
    "windResistTier" INTEGER NOT NULL DEFAULT 2,
    "waterResistTier" INTEGER NOT NULL DEFAULT 1,
    "breathabilityTier" INTEGER NOT NULL DEFAULT 3,
    "material" TEXT,
    "hasVentilation" BOOLEAN NOT NULL DEFAULT false,
    "isHeated" BOOLEAN NOT NULL DEFAULT false,
    "brand" TEXT,
    "model" TEXT,
    "notes" TEXT,
    "activityTagsJson" TEXT NOT NULL DEFAULT '["motorcycle"]',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Garment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarmentComponent" (
    "id" TEXT NOT NULL,
    "garmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT,
    "warmthDelta" INTEGER NOT NULL DEFAULT 0,
    "windResistDelta" INTEGER NOT NULL DEFAULT 0,
    "waterResistDelta" INTEGER NOT NULL DEFAULT 0,
    "breathabilityDelta" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GarmentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "activityType" TEXT NOT NULL DEFAULT 'motorcycle',
    "routeKind" TEXT NOT NULL DEFAULT 'point_to_point',
    "category" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultCommute" BOOLEAN NOT NULL DEFAULT false,
    "startLat" DOUBLE PRECISION NOT NULL,
    "startLon" DOUBLE PRECISION NOT NULL,
    "startLabel" TEXT,
    "endLat" DOUBLE PRECISION NOT NULL,
    "endLon" DOUBLE PRECISION NOT NULL,
    "endLabel" TEXT,
    "waypointsJson" TEXT NOT NULL DEFAULT '[]',
    "typicalDurationMin" INTEGER NOT NULL DEFAULT 30,
    "preferencesJson" TEXT NOT NULL DEFAULT '{}',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteWaypoint" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "address" TEXT,
    "waypointType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteWaypoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL DEFAULT 'motorcycle',
    "routeId" TEXT,
    "planningMode" TEXT NOT NULL DEFAULT 'departure',
    "departureAt" TIMESTAMP(3) NOT NULL,
    "arrivalAt" TIMESTAMP(3),
    "durationMin" INTEGER NOT NULL,
    "intensity" TEXT,
    "snapshotJson" TEXT NOT NULL DEFAULT '{}',
    "routeAnalysisJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherSnapshot" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'low',
    "confidenceScore" DOUBLE PRECISION,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "reasonsJson" TEXT NOT NULL DEFAULT '[]',
    "personalizationJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "garmentId" TEXT,
    "genericLabel" TEXT,

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "routeId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER,
    "wornGarmentIdsJson" TEXT NOT NULL DEFAULT '[]',
    "weatherSummaryJson" TEXT NOT NULL DEFAULT '{}',
    "recommendationJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityFeedback" (
    "id" TEXT NOT NULL,
    "activityLogId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "sweatLevel" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyAreaFeedback" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "BodyAreaFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalOffset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "n" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "meanResidual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalOffset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "scopes" TEXT NOT NULL DEFAULT '',
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'connected',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "userId" TEXT,
    "redirectUri" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubjectId_key" ON "AuthIdentity"("provider", "providerSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MotorcycleProfile_userId_key" ON "MotorcycleProfile"("userId");

-- CreateIndex
CREATE INDEX "Garment_userId_category_idx" ON "Garment"("userId", "category");

-- CreateIndex
CREATE INDEX "GarmentComponent_garmentId_idx" ON "GarmentComponent"("garmentId");

-- CreateIndex
CREATE INDEX "Route_userId_isFavorite_idx" ON "Route"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "Route_userId_activityType_idx" ON "Route"("userId", "activityType");

-- CreateIndex
CREATE INDEX "RouteWaypoint_routeId_sortOrder_idx" ON "RouteWaypoint"("routeId", "sortOrder");

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

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_provider_providerAccountId_key" ON "ConnectedAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_key" ON "ConnectedAccount"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthState_state_key" ON "OAuthState"("state");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherCache_cacheKey_key" ON "WeatherCache"("cacheKey");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotorcycleProfile" ADD CONSTRAINT "MotorcycleProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Garment" ADD CONSTRAINT "Garment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarmentComponent" ADD CONSTRAINT "GarmentComponent_garmentId_fkey" FOREIGN KEY ("garmentId") REFERENCES "Garment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteWaypoint" ADD CONSTRAINT "RouteWaypoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityPlan" ADD CONSTRAINT "ActivityPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityPlan" ADD CONSTRAINT "ActivityPlan_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherSnapshot" ADD CONSTRAINT "WeatherSnapshot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActivityPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActivityPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActivityPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityFeedback" ADD CONSTRAINT "ActivityFeedback_activityLogId_fkey" FOREIGN KEY ("activityLogId") REFERENCES "ActivityLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyAreaFeedback" ADD CONSTRAINT "BodyAreaFeedback_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "ActivityFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalOffset" ADD CONSTRAINT "PersonalOffset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

