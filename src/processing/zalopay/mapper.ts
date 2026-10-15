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
    'Số tiền hoàn trả',
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

export function mapTranslog(t:TransLog):SheetRow{
    return {
        'Ngày giao dịch':formatVnTimeOrEmpty(t.createTime),
        'Mã GD Merchant':t.appTransId,
        'Mã GD Zalopay': t.transId,
        'Nguồn thanh toán':t.pmcName,
        'Kênh thanh toán':CHANNEL[t.zpType ?? ''] ?? t.zpType ?? '',
        'Platform':PLATFORM[t.externalSource ?? ''] ?? t.externalSource ?? '',
        'Trạng thái GD':TRANS_STATUS[t.transStatus ?? ''] ?? t.transStatus ?? '',
        'Mô tả':t.description,
        'Mã ngân hàng':t.tpeBankCode ?? '',
        'Mã ví khác': t.externalSource ?? '',
        'Số tài khoản nhận':t.virtualAccount ?? '',
        'Mã trạng thái Zalopay':t.transCode,
        'Số tiền giao dịch (VNĐ)':toNumberOrEmpty(t.amount),
        'Giảm giá/Ưu đãi (VNĐ)':0,
        'Mã Cashback campaign':'',
        'Ngày xử lý hoàn trả':formatVnTimeOrEmpty(t.createRefundTime) ,
        'Số tiền hoàn trả':toNumberOrEmpty(t.totalRefundAmount),
        'Số tiền Merchant yêu cầu hoàn (VND)': toNumberOrEmpty(t.totalRequestRefundAmount),
        'Merchant UserID':t.merchantUserId ?? ''
    }
}

export function toRow(row:SheetRow):(String|number)[]{
    return COLUMNS.map((c)=> row[c])
}