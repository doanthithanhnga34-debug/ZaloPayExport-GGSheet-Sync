import {
  DateParts,
  TransLog,
  TransLogRequest,
  TransLogResponse,
} from "../../../types/zalopay.type.js";
import { ApiConfig } from "../client.api.js";

export function toDateParts(d: Date): DateParts {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

export class ZalopayApiClient {
  constructor(private readonly cfg: ApiConfig) {}

  private async fetchPage(
    from: Date,
    to: Date,
    pageIndex: number,
    pageSize: number,
  ): Promise<TransLog[]> {
    const body: TransLogRequest = {
      transLogType: "TL_DETAILS",
      fromDate: toDateParts(from),
      toDate: toDateParts(to),
      appId: this.cfg.appId,
      transStatus: "TS_ALL",
      zpSystem: "ZP_TYPE_ALL",
      pageIndex: pageIndex,
      pageSize: pageSize,
      showSummary: true,
      retryFromDate: null,
      retryToDate: null,
      paymentMethod: "PM_UNSPECIFIED",
      orderPlatform: "OP_UNSPECIFIED",
    };

    const res = await fetch(this.cfg.url, {
        method:'POST',
        headers:{
            Accept:'application/json',
            'Content-Type':'application/json',
            appId:this.cfg.appId,
           Authorization: `Bearer ${this.cfg.token}`,
        },
        body:JSON.stringify(body),
        signal:AbortSignal.timeout(30_000)
    })

    if(res.status === 401 || res.status === 403){
        throw new Error(`Token hết hạn ${res.status}`)
    }
    if(!res.ok){
        throw new Error(`API lỗi :${(await res.text()).slice(0,200)}`)
    }

    const json =(await res.json()) as TransLogResponse;
    return json.data ?? []
  }

  async fetchAll(from:Date, to:Date, pageSize=50):Promise<TransLog[]>{
    const all:TransLog[]=[];;
    for(let page=1; page<=200;page++){
        const rows = await this.fetchPage(from,to, page,pageSize);
        all.push(...rows);
        if(rows.length <pageSize) break;
    }
    return all
  }
}
