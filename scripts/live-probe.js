import {createSourceMonitor} from '../server/source-health.js';
import {writeFile} from 'node:fs/promises';
const report=await createSourceMonitor().get();
await writeFile('live-source-report.json',JSON.stringify(report,null,2)+'\n');
console.table(report.sources.map(({name,state,ageSeconds,latencyMs,error})=>({name,state,ageSeconds,latencyMs,error})));
if(report.sources.some(x=>x.state==='unavailable'||x.state==='delayed'))process.exitCode=1;
