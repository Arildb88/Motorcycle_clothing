-- AlterTable
ALTER TABLE "Route" ADD COLUMN "outboundDepartureLocal" TEXT;
ALTER TABLE "Route" ADD COLUMN "returnDepartureLocal" TEXT;

-- AlterTable
ALTER TABLE "ActivityPlan" ADD COLUMN "commuteGroupId" TEXT;
ALTER TABLE "ActivityPlan" ADD COLUMN "commuteLeg" TEXT;

-- CreateIndex
CREATE INDEX "ActivityPlan_commuteGroupId_idx" ON "ActivityPlan"("commuteGroupId");
