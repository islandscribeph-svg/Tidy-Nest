import type { Stage, ServiceType, Source, FileType } from "@prisma/client";

export type ContactSummary = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  company: string | null;
};

export type DealSummary = {
  id: string;
  stage: Stage;
  subStatus: string | null;
  contactSaved: boolean;
  title: string | null;
  serviceType: ServiceType | null;
  source: Source;
  estimatedDealValue: string | null;
  closedDealValue: string | null;
  createdAt: string;
  updatedAt: string;
  contact: ContactSummary;
  assignedTo: { id: string; name: string } | null;
};

export type NoteEntry = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string } | null;
};

export type FileEntry = {
  id: string;
  type: FileType;
  url: string;
  fileName: string;
  uploadedAt: string;
};

export type ChecklistItemEntry = {
  id: string;
  label: string;
  done: boolean;
  sortOrder: number;
};

export type WorksheetEntryRow = {
  id: string;
  description: string;
  hours: string;
  rate: string;
  sortOrder: number;
};

export type ReimbursementItemEntry = {
  id: string;
  itemDetails: string;
  quantity: string;
  unitPrice: string;
  sortOrder: number;
};

export type VendorEntry = {
  id: string;
  vendorName: string;
  shippingFee: string;
  salesTax: string;
  sortOrder: number;
  items: ReimbursementItemEntry[];
};

export type DealDetail = DealSummary & {
  detailsOfProject: string | null;
  sourceDetail: string | null;
  consultFee: string | null;
  consultDate: string | null;
  projectStartDate: string | null;
  dateClosed: string | null;
  invoiceNumber: string | null;
  consultInvoiceNumber: string | null;
  consultInvoiceLink: string | null;
  worksheetNotes: string | null;
  notes: NoteEntry[];
  files: FileEntry[];
  checklistItems: ChecklistItemEntry[];
  worksheetEntries: WorksheetEntryRow[];
  reimbursementVendors: VendorEntry[];
};
