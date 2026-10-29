import { readFile } from "fs/promises";
import type { PrismaClient } from "@prisma/client";
import { contactKey, mapSnapshotItem, type MappedSnapshotDeal } from "@/lib/monday/map-item";
import { parseSnapshot } from "@/lib/monday/parse-snapshot";

export type SnapshotImportResult = {
  itemCount: number;
  contactCount: number;
  skipped: number;
  pulledAt: string | null;
  boardId: string;
  boardName: string;
};

const SAMPLE_FIXTURE_NAME = "sample-board.json";

export function assertLocalSnapshotPath(filePath: string, options?: { allowSampleFixture?: boolean }) {
  if (/^https?:\/\//i.test(filePath.trim())) {
    throw new Error("Snapshot path must be a local file. This app does not call Monday.");
  }
  const base = filePath.split(/[/\\]/).pop() ?? "";
  if (base === SAMPLE_FIXTURE_NAME && !options?.allowSampleFixture) {
    throw new Error("The in-repo sample snapshot is for tests only. Point MONDAY_SNAPSHOT_PATH at your own snapshot file.");
  }
}

export async function readSnapshotFile(filePath: string, options?: { allowSampleFixture?: boolean }): Promise<unknown> {
  assertLocalSnapshotPath(filePath, options);
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text) as unknown;
}

export async function importSnapshotJson(prisma: PrismaClient, raw: unknown): Promise<SnapshotImportResult> {
  const snapshot = parseSnapshot(raw);
  const byId = new Map<string, MappedSnapshotDeal>();
  for (const item of snapshot.items) byId.set(item.id, mapSnapshotItem(item));
  const rows = [...byId.values()];

  const contactCount = await prisma.$transaction(
    async (tx) => {
      await tx.hourEntry.updateMany({ data: { dealId: null } });
      await tx.reimbursementItem.deleteMany({});
      await tx.reimbursementVendor.deleteMany({});
      await tx.additionalCharge.deleteMany({});
      await tx.checklistItem.deleteMany({});
      await tx.worksheetEntry.deleteMany({});
      await tx.note.deleteMany({});
      await tx.file.deleteMany({});
      await tx.deal.deleteMany({});
      await tx.contact.deleteMany({});

      const contactIdByKey = new Map<string, string>();
      for (const row of rows) {
        const key = contactKey(row);
        let contactId = contactIdByKey.get(key);
        if (!contactId) {
          const contact = await tx.contact.create({
            data: {
              firstName: row.firstName || "Unknown",
              lastName: row.lastName,
              email: row.email,
              phone: row.phone,
              streetAddress: row.streetAddress,
              city: row.city,
              state: row.state,
              company: row.company,
              cityState: row.cityState,
              importedValues: {
                firstName: row.firstName || "Unknown",
                lastName: row.lastName,
                email: row.email,
                phone: row.phone,
                streetAddress: row.streetAddress,
                city: row.city,
                state: row.state,
                company: row.company,
              },
            },
          });
          contactId = contact.id;
          contactIdByKey.set(key, contactId);
        }

        await tx.deal.create({
          data: {
            contactId,
            stage: row.stage,
            subStatus: row.subStatus,
            contactSaved: row.contactSaved,
            title: row.title,
            serviceType: row.serviceType,
            detailsOfProject: row.detailsOfProject,
            source: row.source,
            sourceDetail: row.sourceDetail,
            estimatedDealValue: row.estimatedDealValue,
            closedDealValue: row.closedDealValue,
            consultFee: row.consultFee,
            consultDate: row.consultDate,
            projectStartDate: row.projectStartDate,
            dateClosed: row.dateClosed,
            consultInvoiceNumber: row.consultInvoiceNumber,
            consultInvoiceLink: row.consultInvoiceLink,
            invoiceNumber: row.invoiceNumber,
            invoiceLink: row.invoiceLink,
            qbDepositPaymentLink: row.qbDepositPaymentLink,
            qbFinalPaymentLink: row.qbFinalPaymentLink,
            mondayItemId: row.mondayItemId,
            mondayUrl: row.mondayUrl,
            mondayGroupTitle: row.mondayGroupTitle,
            mondayUpdatedAt: row.mondayUpdatedAt,
            worksheetUrl: row.worksheetUrl,
            worksheetId: row.worksheetId,
            worksheetFileName: row.worksheetFileName,
            driveFolderUrl: row.driveFolderUrl,
            invoicePdfUrl: row.invoicePdfUrl,
            invoiceFileName: row.invoiceFileName,
            projectDateTimeText: row.projectDateTimeText,
            projectNotes: row.projectNotes,
            slackChannelId: row.slackChannelId,
            slackChannelEmail: row.slackChannelEmail,
            proposalUrl: row.proposalUrl,
            contractUrl: row.contractUrl,
            declutterFrequency: row.declutterFrequency,
            difficultyLettingGo: row.difficultyLettingGo,
            storageSpace: row.storageSpace,
            dateParseIssues: row.dateParseIssues,
            importedValues: {
              stage: row.stage,
              subStatus: row.subStatus,
              title: row.title,
              detailsOfProject: row.detailsOfProject,
              projectNotes: row.projectNotes,
              consultDate: row.consultDate?.toISOString() ?? null,
              projectStartDate: row.projectStartDate?.toISOString() ?? null,
              dateClosed: row.dateClosed?.toISOString() ?? null,
              estimatedDealValue: row.estimatedDealValue,
              closedDealValue: row.closedDealValue,
              consultFee: row.consultFee,
              invoiceNumber: row.invoiceNumber,
              consultInvoiceNumber: row.consultInvoiceNumber,
              driveFolderUrl: row.driveFolderUrl,
              worksheetUrl: row.worksheetUrl,
              proposalUrl: row.proposalUrl,
              contractUrl: row.contractUrl,
              invoiceLink: row.invoiceLink,
            },
            createdAt: row.createdAt ?? undefined,
            checklistItems: { create: row.checklist.map((label, index) => ({ label, sortOrder: index })) },
          },
        });
      }
      return contactIdByKey.size;
    },
    { timeout: 180_000, maxWait: 10_000 },
  );

  const pulledAt = snapshot.pulledAt && !Number.isNaN(new Date(snapshot.pulledAt).getTime()) ? new Date(snapshot.pulledAt) : null;
  await prisma.syncRun.create({
    data: {
      source: "monday-snapshot",
      status: "success",
      finishedAt: new Date(),
      itemCount: rows.length,
      pulledAt,
      boardId: snapshot.board.id,
      boardName: snapshot.board.name,
      message: "Loaded a read-only snapshot. Monday was not contacted.",
    },
  });

  return {
    itemCount: rows.length,
    contactCount,
    skipped: snapshot.skipped,
    pulledAt: snapshot.pulledAt,
    boardId: snapshot.board.id,
    boardName: snapshot.board.name,
  };
}

export async function importSnapshotFile(
  prisma: PrismaClient,
  filePath: string,
  options?: { allowSampleFixture?: boolean },
): Promise<SnapshotImportResult> {
  const raw = await readSnapshotFile(filePath, options);
  return importSnapshotJson(prisma, raw);
}
