import { Config } from "../config/config.js";
import { Cell, TabSchema } from "../schema/schema.js";


export interface SyncJob{
    name:string;
    tab:string;
    schema:TabSchema;
    fetchRows(cfg:Config):Promise<Cell[][]>
}