import type { Stage, ServiceType, Source, FileType, EmployeeType, CallSource, QualStatus } from "@prisma/client";

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
  employeeId: string | null;
  employee: { id: string; name: string } | null;
  date: string | null;
  description: string;
  hours: string;
  rate: string;
  sortOrder: number;
};

export type AdditionalChargeEntry = {
  id: string;
  description: string;
  amount: string;
  sortOrder: number;
};

export type EmployeeSummary = {
  id: string;
  name: string;
  type: EmployeeType;
  hourlyRate: string;
  active: boolean;
};

export type TimesheetEntryRow = {
  id: string;
  date: string;
  hours: string;
  description: string | null;
  source: "manual";
};

export type WorksheetTimesheetRow = {
  id: string;
  date: string | null;
  hours: string;
  description: string;
  source: "project";
  dealId: string;
  dealTitle: string | null;
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

export type CallEntryRow = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  weekStart: string;
  source: CallSource;
  qualified: QualStatus;
  noShow: boolean;
  notes: string | null;
};

export type CallWeekNoteRow = {
  weekStart: string;
  body: string;
};

export type DealDetail = DealSummary & {
  detailsOfProject: string | null;
  sourceDetail: string | null;
  consultFee: string | null;
  consultDate: string | null;
  projectStartDate: string | null;
  dateClosed: string | null;
  invoiceNumber: string | null;
  invoiceLink: string | null;
  consultInvoiceNumber: string | null;
  consultInvoiceLink: string | null;
  worksheetNotes: string | null;
  notes: NoteEntry[];
  files: FileEntry[];
  checklistItems: ChecklistItemEntry[];
  worksheetEntries: WorksheetEntryRow[];
  reimbursementVendors: VendorEntry[];
  additionalCharges: AdditionalChargeEntry[];
};
