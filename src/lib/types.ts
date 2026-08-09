import type { Stage, ServiceType, Source, FileType, TaskStatus } from "@prisma/client";

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
  subject: string | null;
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

export type TaskEntry = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  sortOrder: number;
};

export type ProjectEntry = {
  id: string;
  projectDateTime: string | null;
  worksheetLink: string | null;
  notes: string | null;
  tasks: TaskEntry[];
};

export type DealDetail = DealSummary & {
  detailsOfProject: string | null;
  sourceDetail: string | null;
  consultFee: string | null;
  consultDate: string | null;
  projectStartDate: string | null;
  dateClosed: string | null;
  invoiceNumber: string | null;
  notes: NoteEntry[];
  files: FileEntry[];
  projects: ProjectEntry[];
};
