import { RecordByKey, TabSchema } from "../../schema/schema.js";
import { TransLog } from "../../types/zalopay.type.js";


export const COLUMNS =[
    'Ngày giao dịch',
    'Mã GD Merchant',
    'Mã GD Zalopay',
    'Nguồn thanh toán',
    'Kênh thanh toán',
    'Platform',
    'Trạng thái GD',
    'Mô tả',
    'Mã ngân hàng',
    'Mã ví khác',
    'Số tài khoản nhận',
    'Mã trạng thái Zalopay',
    'Số tiền giao dịch (VNĐ)',
    'Giảm giá/Ưu đãi (VNĐ)',
    'Mã Cashback campaign',
    'Ngày xử lý hoàn trả',
    'Số tiền hoàn trả cho khách hàng (VND)',
    'Số tiền Merchant yêu cầu hoàn (VND)',
    'Merchant UserID'
] as const;

export type Column = (typeof COLUMNS)[number];
export type SheetRow = Record<Column,string|number>;
const CHANNEL : Record<string,string> ={
    ZP_TYPE_GATEWAY:'Khác',
    ZP_TYPE_APP:'Zalopay App'
}
const PLATFORM: Record<string,string> ={
    OP_ZALOPAY:'Zalopay'
}
const   TRANS_STATUS :  Record<string, string> ={
    TS_SUCCESSFUL:'Thành công',
    TS_FAIL:'Thất bại',
    TS_UNFINISHED:'Chưa hoàn tất'
}
const vnFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Asia/Saigon',
    day:'2-digit',
    month:'2-digit',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit',
    hourCycle:'h23'
})

function formatVnTime(iso:string):string{
    const p = Object.fromEntries(vnFormatter.formatToParts(new Date(iso)).map((x)=> [x.type, x.value]))
    return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute}:${p.second}`
}

function formatVnTimeOrEmpty(iso?: string): string {
  return iso ? formatVnTime(iso) : '';
}

function toNumberOrEmpty(v?: string | number): number | '' {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  return Number.isNaN(n) ? '' : n;
}
export const ZALOPAY_SCHEMA:TabSchema={
  idKey:'zalopay_txn_id',
  sortKey:'created_at',
  columns: [
  { header: "Ngày giao dịch", key: "created_at", type: "datetime" },
  { header: "Mã GD Merchant", key: "merchant_txn_id", type: "text" },
  { header: "Mã GD Zalopay", key: "zalopay_txn_id", type: "text" },
  { header: "Nguồn thanh toán", key: "payment_source", type: "text" },
  { header: "Kênh thanh toán", key: "payment_channel", type: "text" },
  { header: "Platform", key: "platform", type: "text" },
  { header: "Trạng thái GD", key: "status", type: "text" },
  { header: "Mô tả", key: "description", type: "text" },
  { header: "Mã ngân hàng", key: "bank_code", type: "text" },
  { header: "Mã Ví khác", key: "other_wallet_code", type: "text" },
  { header: "Số tài khoản nhận", key: "receiving_account", type: "text" },
  { header: "Mã trạng thái Zalopay", key: "zalopay_status_code", type: "text" },
  { header: "Số tiền giao dịch (VNĐ)", key: "amount", type: "number" },
  { header: "Giảm giá/Ưu đãi (VNĐ)", key: "discount", type: "number" },
  { header: "Mã Cashback campaign", key: "cashback_campaign", type: "text" },
  {
    header: "Ngày xử lý hoàn trả",
    key: "refund_processed_at",
    type: "datetime",
  },
  {
    header: "Số tiền hoàn trả cho khách hàng (VND)",
    key: "refund_amount",
    type: "number",
  },
  {
    header: "Số tiền Merchant yêu cầu hoàn (VND)",
    key: "merchant_refund_request",
    type: "number",
  },
  { header: "Merchant UserID", key: "merchant_user_id", type: "text" },
]

}

export function mapTranslog(t:TransLog):RecordByKey{
    return {
        'created_at':formatVnTimeOrEmpty(t.createTime),
        'merchant_txn_id':t.appTransId,
        'zalopay_txn_id': t.transId,
        'payment_source':t.pmcName,
        'payment_channel':CHANNEL[t.zpType ?? ''] ?? t.zpType ?? '',
        'platform':PLATFORM[t.orderPlatform ?? ''] ?? t.orderPlatform ?? '',
        'status':TRANS_STATUS[t.transStatus ?? ''] ?? t.transStatus ?? '',
        'description':t.description,
        'bank_code':t.tpeBankCode ?? '',
        'other_wallet_code': t.externalSource ?? '',
        'receiving_account':t.virtualAccount ?? '',
        'zalopay_status_code':t.transCode,
        'amount':toNumberOrEmpty(t.amount),
        'discount':0,
        'cashback_campaign':'',
        'refund_processed_at':formatVnTimeOrEmpty(t.createRefundTime) ,
        'refund_amount':toNumberOrEmpty(t.totalRefundAmount),
        'merchant_refund_request': toNumberOrEmpty(t.totalRequestRefundAmount),
        'merchant_user_id':t.merchantUserId ?? ''
    }
}
