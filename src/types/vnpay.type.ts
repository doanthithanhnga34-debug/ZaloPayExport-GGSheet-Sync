export interface TransactionRequest{

}

export interface TransactionPagerDTOS{
    id:string;
    transactionMappingDate:string;
    billNumber:string;
    customerFullName:string;
    customerAccountNumber:string;
    amountAfterDiscount:number;
    terminalName:string;
    terminalCode:string;
    amountBeforeDiscount:number;
    paymentSource:number;
    voucherCode:string;
    status:string
}

export interface VNPayResponse{
    code:string;
    message:string;
    data:{
        transactionPagerDTOS: TransactionPagerDTOS[];
        
    }
}