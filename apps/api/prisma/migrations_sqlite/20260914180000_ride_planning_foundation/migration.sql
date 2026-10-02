-- Ride planning foundation: route preferences + plan departure/arrival mode.
-- Provider-neutral; no clothing/weather stored on Route.

-- Reusable routing preferences on saved Route templates.
ALTER TABLE "Route" ADD COLUMN "preferencesJson" TEXT NOT NULL DEFAULT '{}';

-- ActivityPlan temporal planning fields.
ALTER TABLE "ActivityPlan" ADD COLUMN "planningMode" TEXT NOT NULL DEFAULT 'departure';
ALTER TABLE "ActivityPlan" ADD COLUMN "arrivalAt" DATETIME;
ALTER TABLE "ActivityPlan" ADD COLUMN "routeAnalysisJson" TEXT;
