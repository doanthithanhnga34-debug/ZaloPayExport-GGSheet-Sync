
import { loadConfig } from "./config/config.js";
import { log, setupLogger } from "./logger.js";
import { runOnce } from "./pipeline/sync.pipeline.js";



const cfg = loadConfig();

setupLogger({level:cfg.LOG_LEVEL, fmt:cfg.LOG_FORMAT});


try {
 await runOnce(cfg);

} catch (err) {
  const e = err instanceof Error ? err : new Error(String(err));
  log.error(`Lượt chạy thất bại: ${e.message}`, { err: e, error_type: e.name });
  process.exitCode = 1;
}


