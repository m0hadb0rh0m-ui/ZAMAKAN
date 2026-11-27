import {analyzeSignal} from './signal.js';
self.onmessage=({data})=>{try{self.postMessage({ok:true,result:analyzeSignal(data.samples,data.rate,data.options)});}catch(e){self.postMessage({ok:false,error:e.message});}};
