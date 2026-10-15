export interface TransactionRequest{

}

export interface TransactionPagerDTOS{
    id:string;
    transactionMappingDate:string;
    billNumber:string;
    customerFullName:string;
    customerAccountNumber:string;
    amountAfterDiscount:number;
    shopName:string;
    amountBeforeDiscount:number;
    paymentSource:number
}

export interface VNPayResponse{
    code:string;
    message:string;
    data:{
        transactionPagerDTOS: TransactionPagerDTOS[];
        
    }
}