import { ZALOPAY_SCHEMA } from "../processing/zalopay/mapper.js";
import { SyncJob } from "../types/syncJob.js";
import { fetchZaloPayRows } from "./sync.pipeline.js";

export const jobs: SyncJob[] = [
  {
    name: "zalopay",
    tab: "Test",
    schema: ZALOPAY_SCHEMA,
    fetchRows:fetchZaloPayRows,
  },

 
];
