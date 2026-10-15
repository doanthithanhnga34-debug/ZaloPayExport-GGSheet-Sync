

import crypto from 'node:crypto'
import { Config } from '../config/config.js';
import { SheetClient, UpsertStats } from '../services/sheet/sheet.js';
import { log, setRunId } from '../logger.js';
import { withRetry } from '../utils/retry.js';
import { ZalopayApiClient } from '../services/api/zalopay/zalopay.service.js';
import { mapTranslog, ZALOPAY_SCHEMA } from '../processing/zalopay/mapper.js';
import { Cell, toRow } from '../schema/schema.js';



export async function fetchZaloPayRows(cfg:Config):Promise<Cell[][]>{
    const api = new ZalopayApiClient({url:cfg.ZP_API_URL, token:cfg.ZP_TOKEN, appId:cfg.ZP_APP_ID});
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate()-Number(cfg.LOOKBACK_DAYS));
    const logs = await api.fetchAll(from, to);
    const unique = [...new Map(logs.map((t) => [t.transId, t])).values()];
    const rec = mapTranslog(unique[0]);
console.log('mapper keys:', Object.keys(rec));
console.log('schema keys:', ZALOPAY_SCHEMA.columns.map((c) => c.key));
  return unique.map((t) => toRow(ZALOPAY_SCHEMA, mapTranslog(t)));
}
// export async funtion runOnce(cfg:Config) :Promise<UpsertStats>{
//     setRunId(crypto.randomBytes(4).toString(''))
// }
export async function runOnce(cfg:Config):Promise<UpsertStats>{
    setRunId(crypto.randomBytes(4).toString('hex'));
    log.info('Start run one');
    const api = new ZalopayApiClient({
        url:cfg.ZP_API_URL,
        token:cfg.ZP_TOKEN,
        appId:cfg.ZP_APP_ID
    })
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 20);
    const translogs = await withRetry('Fetch Zalopay api, ', cfg.MAX_RETRIES, ()=>
        api.fetchAll(from,to) ,
    )
    const unique = [...new Map(translogs.map((t)=>[t.transId,t])).values()];
    log.info('Fetched transactions',{fetched: translogs.length, unique:unique.length});
    const matrix = unique.map((t) => toRow(ZALOPAY_SCHEMA, mapTranslog(t)));

    const sheet = new SheetClient(cfg.GSHEET_ID,cfg.GSHEET_ZP_TAB,ZALOPAY_SCHEMA);
    const stats = await withRetry('Write to ggsheet', cfg.MAX_RETRIES,()=>
        sheet.upsert(matrix)
    );
    log.info('Run successfully', {...stats});
    return stats
}