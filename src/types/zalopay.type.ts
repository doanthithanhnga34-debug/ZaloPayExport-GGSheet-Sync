export interface DateParts {
    year:number;
    month:number;
    day:number;
}

export interface TransLogRequest {
    transLogType: string;
    fromDate:DateParts;
    toDate:DateParts;
    appId:string;
    transStatus:string;
    zpSystem:string;
    pageIndex:number;
    pageSize:number;
    showSummary:boolean;
    retryFromDate:null;
    retryToDate:null;
    paymentMethod:string;
    orderPlatform:string;
}
export interface TransLog{
    createTime:string;
    appTransId:string;
    transId:string;
    pmcName:string;
    transStatus:string;
    amount:number;
    transCode:string;
    description:string;
    tpeBankCode:string;
    merchantUserId:string;
    externalSource?:string;//ví khác momo
    orderPlatform?:string; // kênh thanh toán khác
    virtualAccount:string;
    createRefundTime:string;
    totalRefundAmount:number;
    totalRequestRefundAmount:number;
    zpType?:string //ZP_TYPE_GATEWAY: ngân hàng và momo ;ZP_TYPE_APP:zalo pay

}

export interface TransLogResponse{
    transLogType:string;
    data:TransLog[]
}