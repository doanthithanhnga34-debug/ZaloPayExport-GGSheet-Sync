import { mapTranslog } from "../processing/zalopay/mapper.js";
import { ZalopayApiClient } from "../services/api/zalopay/zalopay.service.js";


const client = new ZalopayApiClient({
  url: process.env.ZP_API_URL!,
  token: process.env.ZP_TOKEN!,
  appId: process.env.ZP_APP_ID!,
});

const to = new Date();
const from = new Date();
from.setDate(from.getDate() - 2);

const rows = await client.fetchAll(from, to);
console.log('Số giao dịch:', rows.length);
console.log('Dòng đầu:', rows[0]);
console.log('Có trùng appTransId không?', new Set(rows.map((r) => r.appTransId)).size !== rows.length);
console.log(mapTranslog(rows[0]));

