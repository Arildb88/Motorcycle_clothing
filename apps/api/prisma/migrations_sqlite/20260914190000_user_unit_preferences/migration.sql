-- User unit preferences (display only; engine stays SI/metric).
-- Legacy UserProfile.units remains the temperature preference (celsius|fahrenheit).

ALTER TABLE "UserProfile" ADD COLUMN "distanceUnit" TEXT NOT NULL DEFAULT 'kilometer';
ALTER TABLE "UserProfile" ADD COLUMN "speedUnit" TEXT NOT NULL DEFAULT 'kmh';
ALTER TABLE "UserProfile" ADD COLUMN "windSpeedUnit" TEXT NOT NULL DEFAULT 'ms';
