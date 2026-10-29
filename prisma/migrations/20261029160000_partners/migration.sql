-- CreateEnum
CREATE TYPE "PartnerKind" AS ENUM ('VENDOR', 'SUPPLIER', 'PARTNER');
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PartnerKind" NOT NULL DEFAULT 'VENDOR',
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "driveUrl" TEXT,
    "slackUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerLink" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "dealId" TEXT,
    "contactId" TEXT,

    CONSTRAINT "PartnerLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Partner_name_idx" ON "Partner"("name");
CREATE INDEX "Partner_status_idx" ON "Partner"("status");
CREATE INDEX "PartnerLink_partnerId_idx" ON "PartnerLink"("partnerId");

ALTER TABLE "PartnerLink" ADD CONSTRAINT "PartnerLink_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerLink" ADD CONSTRAINT "PartnerLink_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerLink" ADD CONSTRAINT "PartnerLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
