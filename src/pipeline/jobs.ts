import { VNPAY_SCHEMA } from "../processing/vnpay/mapper.js";
import { ZALOPAY_SCHEMA } from "../processing/zalopay/mapper.js";
import { SyncJob } from "../types/syncJob.js";
import { fetchVNPayRows, fetchZaloPayRows } from "./sync.pipeline.js";

export const jobs: SyncJob[] = [
  {
    name: "zalopay",
    tab: "Zalopay",
    schema: ZALOPAY_SCHEMA,
    fetchRows: fetchZaloPayRows,
  },
  {
    name: "vnpay",
    tab: "VNpay",
    schema: VNPAY_SCHEMA,
    fetchRows: fetchVNPayRows,
  },
];
