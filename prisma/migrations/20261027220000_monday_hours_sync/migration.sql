-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "cityState" TEXT;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "mondayItemId" TEXT,
ADD COLUMN "mondayUrl" TEXT,
ADD COLUMN "mondayGroupTitle" TEXT,
ADD COLUMN "mondayUpdatedAt" TIMESTAMP(3),
ADD COLUMN "worksheetUrl" TEXT,
ADD COLUMN "worksheetId" TEXT,
ADD COLUMN "worksheetFileName" TEXT,
ADD COLUMN "driveFolderUrl" TEXT,
ADD COLUMN "invoicePdfUrl" TEXT,
ADD COLUMN "invoiceFileName" TEXT,
ADD COLUMN "projectDateTimeText" TEXT,
ADD COLUMN "projectNotes" TEXT,
ADD COLUMN "slackChannelId" TEXT,
ADD COLUMN "slackChannelEmail" TEXT,
ADD COLUMN "proposalUrl" TEXT,
ADD COLUMN "contractUrl" TEXT,
ADD COLUMN "declutterFrequency" TEXT,
ADD COLUMN "difficultyLettingGo" TEXT,
ADD COLUMN "storageSpace" TEXT,
ADD COLUMN "dateParseIssues" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Deal_mondayItemId_key" ON "Deal"("mondayItemId");

-- CreateTable
CREATE TABLE "HourEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "personName" TEXT NOT NULL,
    "employeeId" TEXT,
    "dealId" TEXT,
    "clientLabel" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "pulledAt" TIMESTAMP(3),
    "boardId" TEXT,
    "boardName" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HourEntry_date_idx" ON "HourEntry"("date");

-- CreateIndex
CREATE INDEX "HourEntry_dealId_idx" ON "HourEntry"("dealId");

-- CreateIndex
CREATE INDEX "HourEntry_employeeId_idx" ON "HourEntry"("employeeId");

-- AddForeignKey
ALTER TABLE "HourEntry" ADD CONSTRAINT "HourEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourEntry" ADD CONSTRAINT "HourEntry_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
