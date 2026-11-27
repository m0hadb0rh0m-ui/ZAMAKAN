import {analyzeSignal} from './signal.js';
export function spectrogram(samples,rate,{size=256,hop=size/2,transform}={}){
 if(!Number.isFinite(rate)||rate<=0||samples.length<4||samples.length>65536||!samples.every(Number.isFinite)||![64,128,256,512,1024].includes(size)||!Number.isInteger(hop)||hop<1||hop>size)throw Error('Invalid spectrogram parameters');
 const n=Math.min(size,2**Math.floor(Math.log2(samples.length))),step=Math.min(hop,n),frames=Math.min(1024,Math.floor((samples.length-n)/step)+1),bins=n/2+1;
 const power=new Float32Array(frames*bins);let highest=-Infinity;
 for(let i=0;i<frames;i++){const r=analyzeSignal(samples.subarray? samples.subarray(i*step,i*step+n):samples.slice(i*step,i*step+n),rate,{window:'hann',transform});for(let j=0;j<bins;j++){const p=10*Math.log10(Math.max(r.bins[j].powerDensity,1e-30));power[i*bins+j]=p;highest=Math.max(highest,p);}}
 for(let i=0;i<power.length;i++)power[i]=Math.max(-90,power[i]-highest);
 return {power,frames,bins,binHz:rate/n,stepSeconds:step/rate,duration:(samples.length-1)/rate,referenceDb:highest};
}
export function compareSignals(a,b){
 if(a.length!==b.length||a.length<4||a.length>65536||!a.every(Number.isFinite)||!b.every(Number.isFinite))throw Error('Series require equal finite sample counts');
 const ma=a.reduce((s,x)=>s+x,0)/a.length,mb=b.reduce((s,x)=>s+x,0)/b.length;
 let aa=0,bb=0,ab=0,err=0;for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;aa+=x*x;bb+=y*y;ab+=x*y;err+=(a[i]-b[i])**2;}return {correlation:aa&&bb?ab/Math.sqrt(aa*bb):null,rmse:Math.sqrt(err/a.length),n:a.length};
}
