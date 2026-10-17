
import { loadConfig } from "./config/config.js";
import { log, setupLogger } from "./logger.js";
import { buildVNPAYSync, buildZalopaySync} from "./pipeline/sync.pipeline.js";



const cfg = loadConfig();

setupLogger({level:cfg.LOG_LEVEL, fmt:cfg.LOG_FORMAT});

const tasks =[
  {
    name:'zalopay', run:()=>  buildZalopaySync(cfg)
  },
  {
    name:'vnpay', run:() => buildVNPAYSync(cfg)
  }
]

const failed :string[] =[];
for(const t of tasks){
  try{
    await t.run();
  }catch(e){
    failed.push(t.name);
    log.error('Job failed',{job:t.name, err:String(e)})
  }
}
if(failed.length>0) process.exit(1)


