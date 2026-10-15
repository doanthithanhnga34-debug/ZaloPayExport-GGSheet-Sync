import ExcelJS from "exceljs";

const file = process.argv[2];
if (!file) {
  console.error(
    "cách dùng :npx tsx src/tools/inspect-excel.ts .work dấu huyền downloads  dấu huyền <đường dẫn file .xlsx>",
  );
  process.exit(1);
}

const typeOf = (v: unknown): string =>
  v instanceof Date ? "Date" : v === null ? "null" : typeof v;

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
for (const ws of wb.worksheets) {
  console.log(
    `\n === Sheet "${ws.name}" | ${ws.rowCount} dòng | ${ws.columnCount} cột`,
  );
  let shown = 0;
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (shown >= 6) return;
    const cells = (row.values as unknown[]).slice(1);
    console.log(` Dòng ${rowNumber}:`, JSON.stringify(cells));
    if (shown === 1)
      console.log("kiểu dữ liệu", JSON.stringify(cells.map(typeOf)));
    shown++;
  });
}
