// WASM butterfly kernel. Bit-reversal and twiddle preparation in JS, stage execution in WASM.
export async function createWasmSpectrum(bytes){
 const {instance}=await WebAssembly.instantiate(bytes);
 const {memory,stage}=instance.exports;
 return (samples,rate)=>{
  const n=samples.length;if(n<4||n>65536||(n&(n-1)))throw Error('FFT size');
  const a=new Float64Array(memory.buffer),tw=n*16;
  for(let i=0,j=0;i<n;i++){
   a[j*2]=samples[i];a[j*2+1]=0;
   if(i<n-1){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;}
  }
  for(let j=0;j<n/2;j++){const angle=-2*Math.PI*j/n;a[n*2+j*2]=Math.cos(angle);a[n*2+j*2+1]=Math.sin(angle);}
  for(let h=1;h<n;h*=2)stage(n,h,n/(2*h),tw);
  return Array.from({length:n/2+1},(_,i)=>({frequency:i*rate/n,amplitude:Math.hypot(a[2*i],a[2*i+1])*(i===0||i===n/2?1:2)/n}));
 };
}
