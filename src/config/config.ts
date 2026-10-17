import { z } from "zod";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const schema = z.object({
  ZP_API_URL: z.string().default("https://mc.zalopay.vn/homepage/index.html"),
  ZP_TOKEN: z.string(),
  ZP_APP_ID: z.string().default("15847_P451468"),
  ZP_TIMEOUT_MS: z.coerce.number().int().default(60000),
  
  LOOKBACK_DAYS: z.string().default("2"),

  VNPAY_MERCHANT_ID: z.string().default("145308"),
  VNPAY_TOKEN: z.string(),
  VNPAY_BASE_URL: z
    .string()
    .default("https://doitac.vnpay.vn/mcview-backoffice/transaction/search"),

  GSHEET_ID: z.string().min(1),
  GSHEET_ZP_TAB: z.string().default("Zalopay"),
  GSHEET_VN_TAB: z.string().default("VNPay"),
  GSHEET_TEST_TAB: z.string().default("Test"),

  WORK_DIR: z.string().default("./.work"),
  LOG_LEVEL: z.enum(["debug", "info", "warning", "error"]).default("info"),
  LOG_FORMAT: z.enum(["json", "text"]).default("json"),
  MAX_RETRIES: z.coerce.number().int().min(1).default(3),
});

export type Config = z.infer<typeof schema> & {
  downloadDir: string;
  artifactsDir: string;
  stateFile: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}:${i.message}`)
      .join(";");
    throw new Error(`Invalid config -> ${msg}`);
  }
  const work = path.resolve(parsed.data.WORK_DIR);
  const cfg: Config = {
    ...parsed.data,
    downloadDir: path.join(work, "downloads"),
    artifactsDir: path.join(work, "artifacts"),
    stateFile: path.join(work, "browser_state.json"),
  };
  for (const d of [cfg.downloadDir, cfg.artifactsDir])
    fs.mkdirSync(d, { recursive: true });
  return cfg;
}
