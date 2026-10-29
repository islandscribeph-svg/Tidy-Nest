import ExcelJS from "exceljs";

export type Sheet = {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
};

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function sheetToCsv(sheet: Sheet): string {
  const lines = [sheet.headers, ...sheet.rows.map((row) => row.map(cell))];
  return lines.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export async function sheetToXlsx(sheet: Sheet): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tidy Nest";
  const tab = workbook.addWorksheet(sheet.name.slice(0, 31));
  tab.addRow(sheet.headers);
  for (const row of sheet.rows) tab.addRow(row.map((value) => value ?? ""));
  tab.getRow(1).font = { bold: true };
  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}

export async function sheetText(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const parts: string[] = [];
  workbook.eachSheet((tab) => {
    tab.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values : [];
      parts.push(values.map((value) => (value == null ? "" : String(value))).join(" "));
    });
  });
  return parts.join("\n");
}
