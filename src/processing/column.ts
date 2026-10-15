export type ColumnType = "text" | "number" | "datetime";

export const COLUMNS = [
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
] as const;

export type ColumnKey = (typeof COLUMNS)[number]['key'];
export type Cell = string|number;
export type Transaction = Record<ColumnKey,Cell>;
export const ID_KEY: ColumnKey='zalopay_txn_id';
export const SHEET_HEADERS:string[] = COLUMNS.map((c)=>c.header);

export function toMatrix(rows:Transaction[]):Cell[][]{
    return rows.map((r) => COLUMNS.map((c)=> r[c.key]));
}
