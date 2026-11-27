// Windowed amplitude FFT + calibrated PSD; no assumptions about the sample's physical unit.
import {spectrum} from './science.js';
export function analyzeSignal(samples,rate,{window='hann',detrend=false}={}){
 const n=samples.length;if(n<4||n>65536||!samples.every(Number.isFinite)||!Number.isFinite(rate)||rate<=0||!['rectangular','hann','hamming','blackman'].includes(window))throw Error('Invalid signal parameters');
 const mean=samples.reduce((a,b)=>a+b,0)/n,fftN=2**Math.ceil(Math.log2(n));
 let sum=0,sumSquares=0;const padded=Array(fftN).fill(0);
 for(let i=0;i<n;i++){
  const a=2*Math.PI*i/n;
  const w=window==='rectangular'?1:window==='hann'?.5-.5*Math.cos(a):window==='hamming'?.54-.46*Math.cos(a):.42-.5*Math.cos(a)+.08*Math.cos(2*a);
  sum+=w;sumSquares+=w*w;padded[i]=(samples[i]-(detrend?mean:0))*w;
 }
 const bins=spectrum(padded,rate).map((b,i)=>{
  const edge=i===0||i===fftN/2,raw=b.amplitude*fftN/(edge?1:2),power=(edge?1:2)*raw*raw/(rate*sumSquares);
  return {...b,amplitude:b.amplitude*fftN/sum,powerDensity:power,relativeDb:0};
 });
 const max=bins.reduce((a,b)=>Math.max(a,b.amplitude),0);
 for(const b of bins)b.relativeDb=max>0?Math.max(-160,20*Math.log10(b.amplitude/max)):-160;
 const peak=bins.slice(1).reduce((a,b)=>a.amplitude>=b.amplitude?a:b);
 return {bins,peak,n,fftN,window,rate,binHz:rate/fftN,resolutionHz:rate/n,nyquist:rate/2,mean,rms:Math.sqrt(samples.reduce((a,b)=>a+b*b,0)/n)};
}
export function parseSamples(text){
 if(typeof text!=='string'||text.length>2000000||!text.trim())throw Error('Enter plain numeric samples or one-column CSV');
 const tokens=text.trim().split(/[\s,;]+/);
 if(tokens.length>65536||tokens.some(x=>!x.trim()||!Number.isFinite(Number(x))))throw Error('Samples must be finite numeric values (no CSV header)');
 return tokens.map(Number);
}
