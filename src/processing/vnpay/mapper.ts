import { RecordByKey, TabSchema } from "../../schema/schema.js";
import { TransactionPagerDTOS } from "../../types/vnpay.type.js";

export const COLUMNS = [
  "ID",
  "Thời gian GD",
  "Số hóa đơn",
  "Thông tin khách hàng",
  "Số TK/ Số thẻ",
  "Số tiền",
  "Tên điểm thu",
  "Dịch vụ",
  "Mã KM",
  "Số tiền sau KM",
  "Trạng thái",
] as const;

export const VNPAY_SCHEMA: TabSchema = {
  idKey: "id",
  sortKey: "transactionMappingDate",
  columns: [
    {header:'ID', key:'id', type:'text'},
    { header: "Thời gian GD", key: "transactionMappingDate", type: "datetime" },
    { header: "Số hóa đơn", key: "billNumber", type: "text" },
    { header: "Thông tin khách hàng", key: "customerFullName", type: "text" },
    { header: "Số TK/ Số thẻ", key: "customerAccountNumber", type: "text" },
    { header: "Số tiền", key: "amountBeforeDiscount", type: "number" },
    { header: "Tên điểm thu", key: "terminalName", type: "text" },
    { header: "Dịch vụ", key: "paymentSource", type: "text" },
    { header: "Mã KM", key: "voucherCode", type: "text" },
    { header: "Số tiền sau KM", key: "amountAfterDiscount", type: "number" },
    { header: "Trạng thái", key: "status", type: "number" },
  ],
};
export type Column = (typeof COLUMNS)[number];

const SERVICES: Record<string, string | number> = {
  "1": "VNPAY_QR",
  "2": "CTT",
  "3": "SPOS",
  "4": "PhonePOS",
};

const STATUS: Record<string, string> = {
  "1": "Thành công",
  "2": "Không thành công",
  "3": "Chờ kiểm tra",
  "4": "Hủy không thành công",
  "5": "Hủy thành công",
  "6": "Đang thực hiện",
  "7": "Nghi ngờ gian lận",
  "8": "Hết hạn thanh toán",
};


export function mapTrans(t: TransactionPagerDTOS): RecordByKey {
  return {
    id:t.id,
    transactionMappingDate: t.transactionMappingDate,
    billNumber: t.billNumber,
    customerFullName: t.customerFullName,
    customerAccountNumber: t.customerAccountNumber,
    amountBeforeDiscount: t.amountBeforeDiscount,
    terminalName: t.terminalName,
    paymentSource: SERVICES[t.paymentSource ?? ""] ?? "",
    voucherCode: t.voucherCode ?? "",
    amountAfterDiscount: t.amountAfterDiscount,
    status: STATUS[t.status ?? ""] ?? "",
  };
}
