import { Config, loadConfig } from "../config/config.js";
import { fetchZaloPayRows } from "../pipeline/sync.pipeline.js";
import { ZALOPAY_SCHEMA } from "../processing/zalopay/mapper.js";

const cfg = loadConfig();

const rows = await fetchZaloPayRows(cfg);
const cols = ZALOPAY_SCHEMA.columns;
const idPos = cols.findIndex((c) => c.key === ZALOPAY_SCHEMA.idKey);
const sortPos = cols.findIndex((c) => c.key === ZALOPAY_SCHEMA.sortKey);

console.log('Số dòng:', rows.length, '| số cột mỗi dòng:', cols.length);
console.log('Dòng sai số cột:', rows.filter((r) => r.length !== cols.length).length);
console.log('Ô bị NaN:', rows.flat().filter((v) => typeof v === 'number' && Number.isNaN(v)).length);
console.log('ID bị trùng:', rows.length - new Set(rows.map((r) => r[idPos])).size);
console.log('Dòng đầu (mới nhất?):', rows.at(0)?.[sortPos], '| dòng cuối:', rows.at(-1)?.[sortPos]);

cols.forEach((c, i) => console.log(c.header.padEnd(38), '|', rows[0]?.[i]));