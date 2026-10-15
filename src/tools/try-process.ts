import { loadConfig } from "../config/config.js";
import { setupLogger } from "../logger.js";
import { toMatrix } from "../processing/column.js";
import { processExcel } from "../processing/processor.js";
import { SheetClient } from "../services/sheet/sheet.js";


const cfg = loadConfig();
setupLogger({ level: cfg.LOG_LEVEL, fmt: cfg.LOG_FORMAT });
const file = process.argv[2];
if (!file) {
  console.error(
    "Command: npx tsx src/tools/try-process.ts <path file .xlsx>",
  );
  process.exit(1);
}

const { rows} = await processExcel(file);
const client = new SheetClient(cfg.GSHEET_ID, cfg.GSHEET_TAB)
const stats = await client.upsert(toMatrix(rows));
console.log('Kết quả', stats);


