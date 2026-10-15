import { TransactionPagerDTOS, VNPayResponse } from "../../../types/vnpay.type.js";
import { ApiConfig } from "../client.api.js";


export interface VNPayConfig{
    url:string;
    token:string;
    merchantId:string
}

const VN_DAY = new Intl.DateTimeFormat('en-CA',  {
    timeZone:'Asia/SaiGon',
    year:'numeric',
    month:'2-digit',
    day:'2-digit'
})

function vnRange(from:Date, to:Date){
    const [fy,fm,fd] = VN_DAY.format(from).split('-');
    const [ty,tm,td] = VN_DAY.format(to).split('-');

    return {
        fromDate:`${fd}/${fm}${fy} 00:00:00`,
        toDate:`${td}/${tm}/${ty} 23:59:59`,
        dateTransaction:[
            new Date(`${fy}-${fm}-${fd}T00:00:00+07:00`).toISOString(),
            new Date(`${ty}-${tm}-${td}T23:59:59+07:00`).toISOString(),
        ]
    }
}
export class VNpayApiClient{
    constructor(private readonly cfg:VNPayConfig){};

    private async fetchPage(from:Date, to:Date, pageIndex:number, pageSize:number):Promise<TransactionPagerDTOS[]>{
        const range = vnRange(from, to);

        const res = await fetch(`${this.cfg.url}$page=${pageIndex}&size=${pageSize}`,{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'Accept':'application/json',
                'MerchantId': this.cfg.merchantId,
                Authorization:`Bearer ${this.cfg.token}`
            },
            body:JSON.stringify({
                typeSearch:1,
                searchCommon:'',
                paymentSources:[],
                status:[],
                terminalIds:[],
                dateTransaction: range.dateTransaction,
                fromDate:range.fromDate,
                toDate:range.toDate,
                showSocketComponent:false,
                pagination:{
                    current:pageIndex +1,
                    pageSize:pageSize
                }
            }),
            signal:AbortSignal.timeout(30_000)
        })
        if(res.status === 401 || res.status === 403){
            throw new Error(`Lỗi token`)
        }
        if(!res.ok){
            throw new Error(`VNpay lỗi http ${res.status} : ${(await res.text()).slice(0,200)}`)
        }

        const json = (await res.json()) as VNPayResponse;
        if(json.code !=='00'){
            throw new Error(`VNpay trả mã ${json.code}: ${json.message}`)
        }
        return json.data?.transactionPagerDTOS ?? [];

    }

    async fetchAll(from :Date, to :Date, pageSize=100):Promise<TransactionPagerDTOS[]>{
        const all:TransactionPagerDTOS[] = [];
        let prevFirstId:string | undefined;
        for(let page =0; page<200;page++){
            const rows = await this.fetchPage(from, to , page,pageSize);
            if(rows.length === 0) break;
            if(rows[0].id === prevFirstId){
                throw new Error('VNPay trả lại cùng một trang, kiểm tra tham số phân trang')
            }
            prevFirstId = rows[0].id;
            all.push(...rows);
        }
        return all;
    }
}

