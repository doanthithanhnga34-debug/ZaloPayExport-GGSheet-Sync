
import { VNpayApiClient } from "../services/api/vnpay/vnpay.service.js";
import { loadConfig } from "../config/config.js";
import { withRetry } from "../utils/retry.js";
import { log } from "../logger.js";
import { mapTrans, VNPAY_SCHEMA } from "../processing/vnpay/mapper.js";
import { toRow } from "../schema/schema.js";
import { SheetClient } from "../services/sheet/sheet.js";

const config = loadConfig()

const api = new VNpayApiClient({
    url:config.VNPAY_BASE_URL,
    token:config.VNPAY_TOKEN,
    merchantId:config.VNPAY_MERCHANT_ID
})
const to = new Date();
const from = new Date();
from.setDate(from.getDate() - Number(config.LOOKBACK_DAYS));
const translogs = await withRetry('Fetch vnpay api', config.MAX_RETRIES, ()=> api.fetchAll(from,to));
const unique =[...new Map(translogs.map((t)=>[t.id,t])).values()];
log.info('Fetch trans', {fetched:translogs.length,unique:unique.length});
const matrix = unique.map((t)=> toRow(VNPAY_SCHEMA, mapTrans(t)));

const sheet = new SheetClient(config.GSHEET_ID, config.GSHEET_TEST_TAB,VNPAY_SCHEMA);
const stats = await withRetry('write to gg sheet', config.MAX_RETRIES,()=> sheet.upsert(matrix));
log.info('run successfully',{...stats})
