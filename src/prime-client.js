import {Capacitor,registerPlugin} from '@capacitor/core';
import {approvedWeatherBase} from './release-config.js';
const base=approvedWeatherBase(import.meta.env?.VITE_ZAMAKAN_API_BASE||'');
const native=Capacitor.getPlatform()==='android';
const billing=registerPlugin('PrimeBilling');
export const apiAvailable=!native||Boolean(base);
let session='',account;
export async function callApi(path,body,auth=false){
 if(!apiAvailable)throw Error('Service unavailable');
 const r=await fetch((base||'')+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(auth&&session?{authorization:'Bearer '+session}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000),credentials:'omit'});
 if(!r.ok)throw Error('Service unavailable ('+r.status+')');return r.json();
}
export async function setupPrime(root,tr){
 const el=id=>root.querySelector('#'+id),msg=t=>{el('primeStatus').textContent=t;};
 const text=id=>el(id).value;
 const config=await callApi('prime/config').catch(()=>({enabled:false}));
 if(!config.enabled){msg(tr('الاشتراك غير متاح بعد.','Subscription is not available yet.'));return;}
 el('primeAuth').hidden=false;
 async function status(){
  const s=await callApi('prime/status',{},true);account=s.accountId;
  el('primeAuth').hidden=true;el('primeMember').hidden=false;el('primeChange').hidden=!(s.active&&config.ai);
  msg(s.active?tr('PRIME مفعل حتى ','PRIME active until ')+new Date(s.expiresAt).toLocaleDateString():tr('حساب مجاني','Free account'));
  if(native){const {offers}=await billing.products();const box=el('primePlans');box.replaceChildren();for(const plan of offers||[]){const b=document.createElement('button');b.textContent=plan.price+' / '+(plan.period==='P1M'?tr('شهر','month'):tr('سنة','year'));b.onclick=async()=>{try{await billing.buy({plan:plan.id,accountId:account});}catch{msg(tr('تعذر بدء الشراء','Purchase unavailable'));}};box.append(b);}el('primeRestore').hidden=false;}
  else el('primePlans').textContent=tr('الاشتراك من تطبيق Android عبر Google Play.','Subscribe in the Android app via Google Play.');
 }
 const verify=async purchases=>{for(const p of purchases||[])await callApi('prime/verify',{token:p.token},true);await status();};
 if(native)await billing.addListener('purchaseUpdated',async e=>{if(!session)return;try{if(e.code===0)await verify(e.purchases);else msg(tr('لم تكتمل عملية الشراء','Purchase not completed'));}catch{msg(tr('تعذر التحقق، استخدم استعادة الاشتراك.','Verification unavailable; use restore.'));}});
 for(const [id,create] of [['primeSignIn',false],['primeSignUp',true]])el(id).onclick=async()=>{try{const a=await callApi('prime/auth',{email:text('primeEmail'),password:text('primePassword'),create});session=a.token;el('primePassword').value='';await status();}catch{msg(tr('تعذر تسجيل الدخول أو الاتصال','Sign-in or connection failed'));}};
 el('primeRestore').onclick=async()=>{try{await verify((await billing.restore()).purchases);}catch{msg(tr('تعذر الاستعادة','Restore unavailable'));}};
 el('primeLogout').onclick=()=>{session='';account=null;el('primeAuth').hidden=false;el('primeMember').hidden=true;el('primeChange').hidden=true;msg(tr('تم تسجيل الخروج','Signed out'));};
 el('primeDelete').onclick=async()=>{if(!confirm(tr('حذف الحساب لا يلغي اشتراك Google Play. تابع؟','Deleting the account does not cancel Google Play billing. Continue?')))return;try{await callApi('prime/delete',{},true);el('primeLogout').click();}catch{msg(tr('تعذر حذف الحساب','Account deletion failed'));}};
 el('primeAnalyze').onclick=async()=>{
  const output=el('primeAnalysisResult');output.textContent=tr('جارٍ التحليل…','Analyzing…');el('primeAnalyze').disabled=true;
  try{
   const encode=async input=>{const f=input.files[0];if(!f||!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>1500000)throw Error('Image');return {mime:f.type,data:await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(f);})};};
   const result=await callApi('prime/change',{before:await encode(el('primeBefore')),after:await encode(el('primeAfter')),beforeDate:text('primeBeforeDate'),afterDate:text('primeAfterDate')},true);
   output.textContent=result.summary+'\n\n'+result.limitations;
  }catch{output.textContent=tr('تعذر التحليل. تحقق من التواريخ والصور (حتى 1.5 MB لكل صورة) وحدود الاشتراك.','Analysis unavailable. Check image sizes (up to 1.5 MB), dates and subscription quota.');}finally{el('primeAnalyze').disabled=false;}
 };
 if(session)await status().catch(()=>{session='';});
}
