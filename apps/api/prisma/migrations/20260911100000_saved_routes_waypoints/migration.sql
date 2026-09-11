-- AlterTable
ALTER TABLE "Route" ADD COLUMN "description" TEXT;
ALTER TABLE "Route" ADD COLUMN "activityType" TEXT NOT NULL DEFAULT 'motorcycle';
ALTER TABLE "Route" ADD COLUMN "routeKind" TEXT NOT NULL DEFAULT 'point_to_point';
ALTER TABLE "Route" ADD COLUMN "category" TEXT;
ALTER TABLE "Route" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Route" ADD COLUMN "lastUsedAt" DATETIME;

-- CreateTable
CREATE TABLE "RouteWaypoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "label" TEXT,
    "address" TEXT,
    "waypointType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouteWaypoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RouteWaypoint_routeId_sortOrder_idx" ON "RouteWaypoint"("routeId", "sortOrder");

-- CreateIndex
CREATE INDEX "Route_userId_isFavorite_idx" ON "Route"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "Route_userId_activityType_idx" ON "Route"("userId", "activityType");

-- Backfill RouteWaypoint from existing start/end (+ waypointsJson when present)
-- Done in application layer on next read/write; start/end already on Route.
