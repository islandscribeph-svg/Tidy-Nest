-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_dealId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_projectId_fkey";

-- RenameColumn (hand-edited from the raw `prisma migrate diff` output, which
-- proposed DROP COLUMN "subject" + ADD COLUMN "title" — that would have
-- discarded the subject/title text on every already-imported Deal. This
-- preserves it instead.)
ALTER TABLE "Deal" RENAME COLUMN "subject" TO "title";

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "consultInvoiceLink" TEXT,
ADD COLUMN     "consultInvoiceNumber" TEXT,
ADD COLUMN     "worksheetNotes" TEXT;

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "Task";

-- DropEnum
DROP TYPE "TaskStatus";

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorksheetEntry" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorksheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReimbursementVendor" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "shippingFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "salesTax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReimbursementVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReimbursementItem" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "itemDetails" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReimbursementItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorksheetEntry" ADD CONSTRAINT "WorksheetEntry_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementVendor" ADD CONSTRAINT "ReimbursementVendor_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementItem" ADD CONSTRAINT "ReimbursementItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ReimbursementVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
