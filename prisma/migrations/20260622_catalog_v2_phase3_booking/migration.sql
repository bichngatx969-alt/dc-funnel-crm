-- Catalog v2 Phase 3A: Service booking backend.
-- Additive-only migration: creates new enum types, tables and indexes.
-- No data mutation and no destructive schema changes.

CREATE TYPE "ServiceLocationMode" AS ENUM ('ONLINE', 'OFFLINE', 'CUSTOMER_LOCATION', 'HYBRID');

CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE "ServiceProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositVnd" INTEGER NOT NULL DEFAULT 0,
    "cancellationPolicy" TEXT,
    "intakeFormJson" JSONB,
    "locationMode" "ServiceLocationMode" NOT NULL DEFAULT 'OFFLINE',
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceVariation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "priceVnd" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "staffIdsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceVariation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "customerId" TEXT,
    "catalogItemId" TEXT NOT NULL,
    "serviceVariationId" TEXT,
    "staffId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "intakeAnswersJson" JSONB,
    "depositVnd" INTEGER NOT NULL DEFAULT 0,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceProfile_catalogItemId_key" ON "ServiceProfile"("catalogItemId");
CREATE INDEX "ServiceProfile_workspaceId_idx" ON "ServiceProfile"("workspaceId");
CREATE INDEX "ServiceProfile_workspaceId_bookingEnabled_idx" ON "ServiceProfile"("workspaceId", "bookingEnabled");

CREATE INDEX "ServiceVariation_workspaceId_idx" ON "ServiceVariation"("workspaceId");
CREATE INDEX "ServiceVariation_workspaceId_catalogItemId_idx" ON "ServiceVariation"("workspaceId", "catalogItemId");
CREATE INDEX "ServiceVariation_workspaceId_bookingEnabled_idx" ON "ServiceVariation"("workspaceId", "bookingEnabled");
CREATE INDEX "ServiceVariation_deletedAt_idx" ON "ServiceVariation"("deletedAt");

CREATE INDEX "Booking_workspaceId_idx" ON "Booking"("workspaceId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_catalogItemId_idx" ON "Booking"("catalogItemId");
CREATE INDEX "Booking_serviceVariationId_idx" ON "Booking"("serviceVariationId");
CREATE INDEX "Booking_staffId_idx" ON "Booking"("staffId");
CREATE INDEX "Booking_orderId_idx" ON "Booking"("orderId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_startAt_idx" ON "Booking"("startAt");
CREATE INDEX "Booking_deletedAt_idx" ON "Booking"("deletedAt");
CREATE INDEX "Booking_ws_start_idx" ON "Booking"("workspaceId", "deletedAt", "startAt");
CREATE INDEX "Booking_ws_status_start_idx" ON "Booking"("workspaceId", "status", "startAt");
CREATE INDEX "Booking_ws_staff_time_idx" ON "Booking"("workspaceId", "staffId", "startAt", "endAt");
