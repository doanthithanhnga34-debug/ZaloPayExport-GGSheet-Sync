

type Level = 'debug' | 'info' | 'warning' |'error';
type LogContext = Record<string,unknown>;
const LEVELS: Record<Level,number> ={debug:10, info:20, warning:30, error:40}
let threshold = LEVELS.info;
let format:'json'|'text' = 'json';
let runId ='-'
export function setupLogger(opts:{level?: Level; fmt?:'json' | 'text'} ={}):void{
    threshold = LEVELS[opts.level ?? 'info'];
    format = opts.fmt ?? 'json'
}

export function setRunId(id:string) : void{
    runId=id
}
function write(level:Level, message:string,ctx:LogContext ={}):void{
    if(LEVELS[level] < threshold) return;
    const severity = level.toUpperCase();
    const out : LogContext ={...ctx};
    if(out.err instanceof Error) out.err = out.err.stack ?? String(out.err);

    if(format === 'json'){
        console.log(JSON.stringify({severity,message,run_id : runId,...out}));

    }else{
        const extra = Object.keys(out).length ? '' +JSON.stringify(out) : '';
        console.log(`${new Date().toISOString()} ${severity.padEnd(7)} [${runId}] ${message} ${extra}`)
    }
}

export const log = {
    debug: (m: string, c?: LogContext) => write('debug', m, c),
    info: (m: string, c?: LogContext) => write('info', m, c),
    warn: (m: string, c?: LogContext) => write('warning', m, c),
    error: (m: string, c?: LogContext) => write('error', m, c),
};




















