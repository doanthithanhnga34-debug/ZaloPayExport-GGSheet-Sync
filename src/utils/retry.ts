import { resolve } from "node:dns";

import { de } from "zod/locales";
import { SyncError } from "../error.js";
import { log } from "../logger.js";


const NETWORK_CODES = new Set(['ECONNRESET', 'ETIMEDOUT','ENOTFOUND', 'ECONNREFUSED'])


function shouldRetry(err:unknown):boolean{
    if(err instanceof SyncError) return err.retryable;
    const code = (err as{code?: unknown} | null)?.code;
    return typeof code === 'string' && NETWORK_CODES.has(code)
}

const sleep = (ms:number):Promise<void> => new Promise((resolve) => setTimeout(resolve,ms));

export async function withRetry<T>(label:string, maxAttempts:number, fn:(attempt:number) =>Promise<T>,):Promise<T>{
    for(let attempt =1; ; attempt++){
        try{
            return await fn(attempt);
        }catch(err){
            if(attempt >=maxAttempts || !shouldRetry(err)) throw err;

            const delay = Math.min(60_000, 2000 * 2**(attempt-1)) *(0.5+Math.random() /2)
            log.warn(`${label} thất bại, sẽ thử lại`,{
                attempt,
                max:maxAttempts,
                delay_ms:Math.round(delay),
                reason:err instanceof Error ? err.message:String(err)
            });
            await sleep(delay);
        }
    }
}