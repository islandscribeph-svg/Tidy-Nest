-- CreateEnum
CREATE TYPE "CallSource" AS ENUM ('CONTENT', 'ADS', 'COLD_EMAIL', 'REFERRAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "QualStatus" AS ENUM ('QUALIFIED', 'UNQUALIFIED', 'PENDING');

-- CreateTable
CREATE TABLE "CallEntry" (
    "id" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "source" "CallSource" NOT NULL DEFAULT 'UNKNOWN',
    "qualified" "QualStatus" NOT NULL DEFAULT 'PENDING',
    "noShow" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallWeekNote" (
    "weekStart" TIMESTAMP(3) NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallWeekNote_pkey" PRIMARY KEY ("weekStart")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallEntry_calendarEventId_key" ON "CallEntry"("calendarEventId");

-- CreateIndex
CREATE INDEX "CallEntry_weekStart_idx" ON "CallEntry"("weekStart");
