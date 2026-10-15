import ExcelJS from "exceljs";
import { Cell, COLUMNS, ColumnType, ID_KEY, Transaction } from "./column.js";
import { DataValidationError } from "../error.js";
import { log } from "../logger.js";


type Plain = string | number | boolean | Date | null;
const pad = (n: number | string): string => String(n).padStart(2, "0");

function toPlain(v: ExcelJS.CellValue): Plain {
  if (v === null || v === undefined) return null;
  if (typeof v !== "object" || v instanceof Date) return v;
  if ("richText" in v) return v.richText.map((t) => t.text).join("");
  if ("result" in v) return toPlain(v.result as ExcelJS.CellValue);
  if ("text" in v) return String(v.text);
  return null;
}

export function parseAmount(v: Plain): number | "" {
  if (typeof v === "number") return v;
  let s = String(v ?? "").replace(/[^\d\-.,]/g, "");
  if (!s) return "";
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : "";
}
export function formatDate(v: Plain): string {
  if (v instanceof Date) {
    return (
      `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())} ` +
      `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}`
    );
  }
  const s = String(v ?? "").trim();
  const m = s.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (m) {
    const [, d, mo, y, h = "0", mi = "0", se = "0"] = m;
    return `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(se)}`;
  }
  return s;
}



function convert(type: ColumnType, v: Plain): Cell {
  switch (type) {
    case "number":
      return parseAmount(v);
    case "datetime":
      return formatDate(v);
    default:
      return v instanceof Date ? formatDate(v) : String(v ?? "").trim();
  }
}

export interface ProcessStats {
  rowsRead: number;
  rowsKept: number;
  duplicatesRemoved: number;
  badAmounts: number;
}

export async function processExcel(
  filePath: string,
): Promise<{ rows: Transaction[]; stats: ProcessStats }> {
  log.info(`start mapper excel with ggsheet`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  if (!ws) throw new DataValidationError("File Excel has not any sheet");

  let headerRowNo = 0;
  ws.eachRow({ includeEmpty: false }, (_row, n) => {
    if (headerRowNo === 0) headerRowNo = n;
  });
  if (headerRowNo === 0) throw new DataValidationError("File Excel rỗng");

    // So khớp tên cột: chuẩn hoá Unicode, bỏ khoảng trắng thừa, không phân biệt hoa/thường
  const norm = (s: string): string => s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

  const headerRow = ws.getRow(headerRowNo);
  const colIndex = new Map<string, number>(); // tên cột (đã chuẩn hoá) -> số thứ tự cột
  const foundHeaders: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const name = String(toPlain(cell.value) ?? '').trim();
    if (name) {
      colIndex.set(norm(name), colNumber);
      foundHeaders.push(name);
    }
  });

  const missing = COLUMNS.filter((c) => !colIndex.has(norm(c.header))).map((c) => c.header);
  if (missing.length > 0) {
    throw new DataValidationError(
      `Thiếu cột: ${JSON.stringify(missing)}. Sheet "${ws.name}", dòng tiêu đề ${headerRowNo}, ` +
        `các cột tìm thấy: ${JSON.stringify(foundHeaders)}. Có thể portal đã đổi định dạng file xuất.`,
    );
  }

  // Sau kiểm tra trên, mọi cột đều tồn tại nên dấu ! là an toàn
  const cols = COLUMNS.map((c) => ({ ...c, idx: colIndex.get(norm(c.header))! }));
  const byId = new Map<string, Transaction>();
  let rowsRead = 0;
  let badAmounts = 0;

  for (let n = headerRowNo + 1; n <= ws.rowCount; n++) {
    const row = ws.getRow(n);
    if (!row.hasValues) continue;
    const rec = {} as Transaction;
    for (const c of cols) {
      rec[c.key] = convert(c.type, toPlain(row.getCell(c.idx).value));
    }
    const id = String(rec[ID_KEY]).trim();
    if (!id) continue;
    rowsRead++;
    if (rec.amount === "") badAmounts++;
    byId.set(id, rec);
  }
  const rows = [...byId.values()];
  const stats: ProcessStats = {
    rowsRead,
    rowsKept: rows.length,
    duplicatesRemoved: rowsRead - rows.length,
    badAmounts,
  };
  if (badAmounts > 0)
    log.warn("Có dòng không đọc được số tiền", { count: badAmounts });
  log.info("Đã xử lý file Excel", { ...stats });
  return { rows, stats };
}
