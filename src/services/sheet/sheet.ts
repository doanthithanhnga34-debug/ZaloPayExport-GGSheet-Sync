import { google, sheets_v4 } from "googleapis";
import { SyncError, TransientError } from "../../error.js";
import { Cell, COLUMNS, ID_KEY, SHEET_HEADERS } from "../../processing/column.js";
import { log } from "../../logger.js";


const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
]);
const NUMBER_PATTERN = '#,##0';

function colLetter(n: number): string {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) {
    s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  }
  return s;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface UpsertStats {
  inserted: number;
  updated: number;
  unchanged: number;
}

function wrapError(e: unknown): SyncError {
  const err = e as {
    code?: number | string;
    status?: number;
    message?: string;
  };
  const status = Number(err.code ?? err.status);
  const msg = err.message ?? String(e);

  if (TRANSIENT_STATUS.has(status) || NETWORK_CODES.has(String(err.code))) {
    return new TransientError(`Sheets API ${status || err.code}: ${msg}`, {
      cause: e,
    });
  }
  if (status === 403) {
    return new SyncError(
      `Không có quyền (403). Hãy chia sẻ Google Sheet cho email service account (quyền Editor), ` +
        `và kiểm tra đã bật Google Sheets API. Chi tiết: ${msg}`,
      { cause: e },
    );
  }
  if (status === 404) {
    return new SyncError(
      `Không tìm thấy Google Sheet (404). Kiểm tra lại GSHEET_ID. Chi tiết: ${msg}`,
      { cause: e },
    );
  }
  return new SyncError(`Lỗi Sheets API: ${msg}`, { cause: e });
}

export class SheetClient {
  private api: sheets_v4.Sheets | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly tab: string,
  ) {}

  private getApi(): sheets_v4.Sheets {
    if (!this.api) {
      const auth = new google.auth.GoogleAuth({ scopes: SCOPES });
      this.api = google.sheets({ version: "v4", auth });
    }
    return this.api;
  }

  private async ensureTab(api: sheets_v4.Sheets): Promise<number> {
    const meta = await api.spreadsheets.get({
      spreadsheetId: this.sheetId,
      fields: "sheets.properties(sheetId,title)",
    });

    const found = meta.data.sheets?.find(
      (s) => s.properties?.title === this.tab,
    );
    const existingId = found?.properties?.sheetId;
    if (existingId != null) return existingId;
    const res = await api.spreadsheets.batchUpdate({
      spreadsheetId: this.sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: this.tab } } }],
      },
    });
    const createdId = res.data.replies?.[0]?.addSheet?.properties?.sheetId;
    if (createdId == null)
      throw new SyncError("Created new tab  but do not get sheet id ");
    log.info("created new tab", { tab: this.tab });
    return createdId;
  }
  
  private async applyNumberFormats(api: sheets_v4.Sheets, tabId: number): Promise<void> {
    const requests: sheets_v4.Schema$Request[] = COLUMNS.flatMap((c, idx) =>
      c.type === 'number'
        ? [
            {
              repeatCell: {
                range: { sheetId: tabId, startRowIndex: 1, startColumnIndex: idx, endColumnIndex: idx + 1 },
                cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: NUMBER_PATTERN } } },
                fields: 'userEnteredFormat.numberFormat',
              },
            },
          ]
        : [],
    );
    if (requests.length === 0) return;
    await api.spreadsheets.batchUpdate({ spreadsheetId: this.sheetId, requestBody: { requests } });
  }

  async upsert(matrix: Cell[][]): Promise<UpsertStats> {
    if (matrix.length === 0) return { inserted: 0, updated: 0, unchanged: 0 };
    const last = colLetter(SHEET_HEADERS.length);;
    const q = `${this.tab}`;
    const idPos = COLUMNS.findIndex((c) => c.key === ID_KEY)
    const createdPos = COLUMNS.findIndex((c)=> c.key === 'created_at');
    try{
        const api = this.getApi();
        const tabId = await this.ensureTab(api);
        await this.applyNumberFormats(api, tabId);
        const res= await api.spreadsheets.values.get({
            spreadsheetId:this.sheetId,
            range:`${q}!A:${last}`,
            valueRenderOption:'UNFORMATTED_VALUE'
        })
        const values : unknown[][]= res.data.values ?? [];

        if(values.length === 0){
            await api.spreadsheets.values.update({
                spreadsheetId:this.sheetId,
                range:`${q}!A1`,
                valueInputOption:'RAW',
                requestBody:{values:[SHEET_HEADERS]}
            });
            values.push([...SHEET_HEADERS]);
            log.info('Wrote headers of sheets')
        }
        if(JSON.stringify(values[0]) !== JSON.stringify(SHEET_HEADERS)){
            throw new SyncError(`Headers on sheet is not match with config: ${JSON.stringify(values[0])}`)
        }


        const existing = new Map<string,{rowNo:number, row:unknown[]}>();
        values.slice(1).forEach((row,i) =>{
            const id = String(row[idPos] ?? '');
            if(id) existing.set(id,{rowNo:i+2,row});
        });
        const newRows :Cell[][] =[];
        const updates:{range:string, values:Cell[][]}[] = [];
        let unchanged = 0;

        for(const rec of matrix){
            const found = existing.get(String(rec[idPos]));
            if(!found){
                newRows.push(rec);
                continue;
            }
            const same = rec.every((v,k)=> String(found.row[k] ?? '') === String(v ?? ''));
            if(same){
                unchanged++
            }else{
                updates.push({range:`${q}!A${found.rowNo}:${last}${found.rowNo}`, values:[rec]})
            }
        }

        for(const data of chunk(updates,500)){
          await api.spreadsheets.values.batchUpdate({
            spreadsheetId:this.sheetId,
            requestBody:{valueInputOption:'RAW', data}
          })
        }

        if(newRows.length> 0){
          newRows.sort((a,b) => String(b[createdPos]).localeCompare(String(a[createdPos])));
          await api.spreadsheets.batchUpdate({
            spreadsheetId:this.sheetId,
            requestBody:{
              requests:[
                {
                  insertDimension:{
                    range:{sheetId:tabId, dimension:'ROWS',startIndex:1, endIndex:1+newRows.length},
                    inheritFromBefore:false

                  }
                }
              ]
            }
          });
          await api.spreadsheets.values.update({
            spreadsheetId:this.sheetId,
            range:`${q}!A2`,
            valueInputOption:'RAW',
            requestBody:{values:newRows}
          })
        }
        const stats:UpsertStats={inserted:newRows.length,updated:updates.length,unchanged};
        log.info('Sync to Gg sheet', {...stats});
        return stats;
    }catch(e){
      if(e instanceof SyncError) throw e;
      throw wrapError(e)
    }
  }
}
