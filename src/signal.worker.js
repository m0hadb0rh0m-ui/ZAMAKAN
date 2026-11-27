import {spectrogram,compareSignals} from './dsp-extra.js';
import {analyzeSignal} from './signal.js';
import {createWasmSpectrum} from './fft-wasm.js';
import kernelUrl from './fft-kernel.wasm?url&no-inline';
let kernel;
self.onmessage=async({data})=>{
 try{
  const started=performance.now();
  let transform,engine='JavaScript fallback';
  if(data.options?.wasm!==false){
   try{kernel??=fetch(kernelUrl).then(r=>{if(!r.ok)throw Error('WASM HTTP '+r.status);return r.arrayBuffer();}).then(createWasmSpectrum);transform=await kernel;engine='WebAssembly';}catch{kernel=undefined;}
  }
  if(data.kind==='compare'){const result=compareSignals(new Float64Array(data.samples),new Float64Array(data.other));self.postMessage({ok:true,result});return;}
  if(data.kind==='spectrogram'){const {power,...rest}=spectrogram(new Float64Array(data.samples),data.rate,{...data.options,transform});self.postMessage({ok:true,result:{...rest,engine,elapsedMs:performance.now()-started},packed:power.buffer},[power.buffer]);return;}
  const {bins,...result}=analyzeSignal(new Float64Array(data.samples),data.rate,{...data.options,transform});
  const packed=new Float64Array(bins.length*4);
  bins.forEach((b,i)=>packed.set([b.frequency,b.amplitude,b.powerDensity,b.relativeDb],i*4));
  self.postMessage({ok:true,result:{...result,engine,elapsedMs:performance.now()-started},packed:packed.buffer},[packed.buffer]);
 }catch(e){self.postMessage({ok:false,error:e.message});}
};
