
import fs from 'node:fs';

import crypto from 'node:crypto'
import { Config } from '../config/config.js';
import { SheetClient, UpsertStats } from '../services/sheet/sheet.js';
import { log, setRunId } from '../logger.js';
import { withRetry } from '../utils/retry.js';
import { withPortal } from '../browser/portal.js';
import { processExcel } from '../processing/processor.js';
import { toMatrix } from '../processing/column.js';


export async function runOnce(cfg:Config):Promise<UpsertStats>{
    setRunId(crypto.randomBytes(4).toString('hex'));
    log.info('Start run one');

    const file = await withRetry('Download file', cfg.MAX_RETRIES,()=> withPortal(cfg, async (portal)=>{
        await portal.login();
        return portal.downloadTransactions();
    }))

    const {rows} = await processExcel(file);
    const sheet = new SheetClient(cfg.GSHEET_ID,cfg.GSHEET_TAB);
    const stats = await withRetry('Write to ggsheet', cfg.MAX_RETRIES,()=>
        sheet.upsert(toMatrix(rows))
    );

    fs.rmSync(file,{force:true});
    log.info('Run successfully', {...stats});
    return stats
}