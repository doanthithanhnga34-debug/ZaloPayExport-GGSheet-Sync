export type Cell = string | number;



export interface ColumnDef{
    key:string;
    header:String;
    type:'text' | 'number' | 'datetime';
}

export interface TabSchema{
    columns:ColumnDef[];
    idKey:string;
    sortKey:string
}

export type RecordByKey = Record<string,Cell>

export function toRow(schema: TabSchema, rec: RecordByKey): Cell[] {
  return schema.columns.map((c) => {
    if (!(c.key in rec)) throw new Error(`Mapper thiếu key "${c.key}"`);
    return rec[c.key];
  });
}