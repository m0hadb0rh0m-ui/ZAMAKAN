import {pushAvailable,pushDetails,setPush} from './push.js';
import {saveFavorites} from './navigation.js';
import {validateUserState} from '../shared/user-state.js';
const initial={lang:'ar',theme:'dark',font:'standard',motion:'system',auto:true,lowData:false};
export function getPreferences(){
 try{const p=JSON.parse(localStorage.getItem('zamakan.preferences')||'{}');return {...initial,lang:p.lang==='en'?'en':'ar',theme:p.theme==='light'?'light':'dark',font:p.font==='large'?'large':'standard',motion:p.motion==='reduced'?'reduced':'system',auto:p.auto!==false,lowData:p.lowData===true};}catch{return {...initial};}
}
export function savePreferences(p){try{localStorage.setItem('zamakan.preferences',JSON.stringify(p));}catch{}}
export function applyPreferences(p){
 document.documentElement.classList.toggle('low-data',p.lowData);document.documentElement.classList.toggle('light',p.theme==='light');document.documentElement.classList.toggle('large-text',p.font==='large');document.documentElement.classList.toggle('reduced-motion',p.motion==='reduced');
}
const make=(t,text,cls)=>{const n=document.createElement(t);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
export function createSettings({state,apply}){
 const dialog=make('dialog',null,'settings-dialog');dialog.setAttribute('aria-labelledby','settings-title');document.body.append(dialog);
 const tr=(ar,en)=>state.lang==='ar'?ar:en;
 function choice(parent,label,key,options){
  const wrap=make('label',label,'setting-field'),select=make('select');for(const [value,name] of options){const o=make('option',name);o.value=value;select.append(o);}select.value=state.preferences[key];wrap.append(select);parent.append(wrap);
  select.onchange=()=>{state.preferences[key]=select.value;apply();if(key==='lang')draw();};
 }
 async function request(path,body){
  const options={credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000)};
  if(body!==undefined){options.method='POST';options.headers={'Content-Type':'application/json'};options.body=JSON.stringify(body);}
  const r=await fetch('./api/auth/'+path,options),d=await r.json();if(!r.ok)throw Error(d.error||'server-error');return d;
 }
 let mode='login',session=null;
 function message(e){return ({'invalid-credentials':tr('اسم المستخدم أو كلمة المرور غير صحيحة.','Invalid username or password.'),'registration-unavailable':tr('تعذر إنشاء الحساب بهذا الاسم.','Account registration unavailable.'),'invalid-credentials-format':tr('استخدم اسمًا إنجليزيًا من ٣–٣٢ حرفًا وكلمة مرور من ١٢ حرفًا على الأقل.','Use a 3–32 character Latin username and password of at least 12 characters.'),'rate-limit':tr('محاولات كثيرة. انتظر ١٥ دقيقة.','Too many attempts. Wait 15 minutes.'),'try-again':tr('الخادم مشغول. حاول لاحقًا.','Server busy. Try later.')})[e.message]||tr('تعذر الاتصال بخدمة الحسابات.','Account service unavailable.');}
 function syncPanel(content){
  const area=make('section',null,'settings-section'),title=make('h3',tr('مزامنة الحساب','Account sync')),info=make('p',tr('اختر رفع أو تنزيل تفضيلاتك ومواقعك المفضلة فقط. لا تُرسل بيانات GPS أو ملفاتك تلقائيًا.','Choose upload or download of preferences and favorites only. No automatic GPS history or file upload.'),'muted'),status=make('p',null,'settings-message');
  const load=make('button',tr('استعادة النسخة المحفوظة','Restore saved state')),upload=make('button',tr('حفظ على الحساب','Save to account'));load.disabled=upload.disabled=true;let revision=null,snapshot=null;
  const refresh=async()=>{load.disabled=upload.disabled=true;try{const d=await request('sync');revision=d.revision;snapshot=d.state;status.textContent=d.updated?tr('آخر نسخة: ','Last saved: ')+new Date(d.updated).toLocaleString():tr('لا توجد نسخة محفوظة','No saved state');load.disabled=!snapshot;upload.disabled=false;}catch(e){status.textContent=message(e);}};
  load.onclick=()=>{if(!snapshot)return;const valid=validateUserState(snapshot);state.preferences=valid.preferences;state.favorites=valid.favorites;saveFavorites(state.favorites);apply();draw();};
  upload.onclick=async()=>{upload.disabled=load.disabled=true;try{const r=await request('sync',{revision,state:validateUserState({preferences:state.preferences,favorites:state.favorites})});revision=r.revision;status.textContent=tr('تم الحفظ','Saved');await refresh();}catch(e){await refresh();status.textContent=e.message==='sync-conflict'?tr('تغيرت النسخة على جهاز آخر. راجعها قبل الحفظ مجددًا.','Saved state changed elsewhere. Review before saving again.'):message(e);}};
  area.append(title,info,load,upload,status);content.append(area);refresh();
 }
 function account(parent){
  const box=make('section',null,'settings-section');parent.append(box);box.append(make('h3',tr('الحساب والأمان','Account & security')));
  const content=make('div');box.append(content);
  function render(){
   content.replaceChildren();
   if(!session){content.append(make('p',tr('جارٍ التحقق من خدمة الحسابات…','Checking account service…'),'muted'));return;}
   if(!session.enabled){content.append(make('p',tr('وضع الضيف: تسجيل الحسابات يتطلب خادم ZAMAKAN مفعّلًا؛ لا تحفظ هذه النسخة كلمات مرور.','Guest mode: accounts require an enabled ZAMAKAN backend. No passwords are stored here.'),'tag'));return;}
   if(session.provider==='chatgpt'){
    content.append(make('p',session.user?tr('تم الدخول عبر حساب ChatGPT','Signed in with ChatGPT'):tr('استخدم الدخول الآمن عبر ChatGPT','Secure ChatGPT sign-in')));
    const a=make('a',session.user?tr('تسجيل الخروج','Sign out'):tr('تسجيل الدخول','Sign in'));a.href=session.user?'/signout-with-chatgpt?return_to=%2F':'/signin-with-chatgpt?return_to=%2F';a.target='_top';content.append(a);
    if(session.user){syncPanel(content);const erase=make('button',tr('حذف بيانات زَمَكان من السحابة','Delete ZAMAKAN cloud data'));erase.onclick=async()=>{if(!confirm(tr('هل تريد حذف المفضلة والتفضيلات المحفوظة نهائيًا؟ لن يُحذف حساب ChatGPT.','Permanently delete saved favorites and preferences? Your ChatGPT account is not deleted.')))return;erase.disabled=true;try{await request('delete',{confirm:true});alert(tr('حُذفت بياناتك السحابية.','Your cloud data was deleted.'));draw();}catch(e){alert(message(e));erase.disabled=false;}};content.append(erase);}return;
   }
   if(session.local)content.append(make('p',tr('حساب محلي على هذا الجهاز فقط؛ لا مزامنة سحابية.','Local account on this device only; no cloud sync.'),'muted'));
   const output=make('p',null,'settings-message');output.setAttribute('role','status');
   if(session.user){
    content.append(make('p',tr('مرحبًا، ','Signed in as ')+session.user.username));
    const logout=make('button',tr('تسجيل الخروج','Sign out'));logout.onclick=async()=>{logout.disabled=true;try{await request('logout',{});session.user=null;render();}catch(e){output.textContent=message(e);logout.disabled=false;}};content.append(logout);
    const change=make('form',null,'settings-form'),old=make('input'),next=make('input');old.type=next.type='password';old.autocomplete='current-password';next.autocomplete='new-password';old.required=next.required=true;next.minLength=12;old.maxLength=512;next.maxLength=512;
    for(const [input,label] of [[old,tr('كلمة المرور الحالية','Current password')],[next,tr('كلمة المرور الجديدة','New password')]]){const l=make('label',label,'setting-field');l.append(input);change.append(l);}
    const submit=make('button',tr('تغيير كلمة المرور','Change password'));submit.type='submit';change.append(submit);change.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{await request('password',{password:old.value,newPassword:next.value});old.value=next.value='';output.textContent=tr('تم تغيير كلمة المرور وإلغاء الجلسات السابقة.','Password updated; previous sessions revoked.');}catch(e){output.textContent=message(e);}finally{submit.disabled=false;}};const erase=make('form',null,'settings-form'),delPw=make('input'),delLabel=make('label',tr('كلمة المرور لتأكيد حذف الحساب','Password to confirm account deletion'),'setting-field');delPw.type='password';delPw.required=true;delPw.maxLength=512;delPw.autocomplete='current-password';delLabel.append(delPw);const delBtn=make('button',tr('حذف الحساب والبيانات نهائيًا','Permanently delete account and data'));delBtn.type='submit';erase.append(delLabel,delBtn);erase.onsubmit=async e=>{e.preventDefault();if(!confirm(tr('حذف الحساب والبيانات المحفوظة نهائيًا؟','Permanently delete account and saved data?')))return;delBtn.disabled=true;try{await request('delete',{confirm:true,password:delPw.value});delPw.value='';session.user=null;render();}catch(e){output.textContent=message(e);delBtn.disabled=false;}};content.append(change,output,erase);syncPanel(content);return;
   }
   const switchMode=make('button',mode==='login'?tr('إنشاء حساب جديد','Create account'):tr('لدي حساب','I have an account'));switchMode.onclick=()=>{mode=mode==='login'?'register':'login';render();};content.append(switchMode);
   const form=make('form',null,'settings-form'),user=make('input'),pw=make('input');user.name='username';user.autocomplete='username';user.required=true;user.minLength=3;user.maxLength=32;user.pattern='[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}';user.dir='ltr';pw.name='password';pw.type='password';pw.required=true;pw.maxLength=512;pw.autocomplete=mode==='register'?'new-password':'current-password';if(mode==='register')pw.minLength=12;
   for(const [input,label] of [[user,tr('اسم مستخدم إنجليزي','Latin username')],[pw,tr('كلمة المرور','Password')]]){const l=make('label',label,'setting-field');l.append(input);form.append(l);}
   form.append(make('small',tr('الحساب اختياري. لا نطلب بريدًا أو رقم هاتف؛ لا توجد استعادة كلمة مرور أو MFA بعد.','Account is optional. No email or phone required; recovery and MFA are not yet available.'),'muted'));
   const submit=make('button',mode==='register'?tr('تسجيل حساب','Register'):tr('تسجيل الدخول','Sign in'),'primary-btn');submit.type='submit';form.append(submit);form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{const result=await request(mode,{username:user.value,password:pw.value});pw.value='';session.user=result.user;render();}catch(e){output.textContent=message(e);}finally{submit.disabled=false;}};
   content.append(form,output);
  }
  render();request('session').then(d=>{session=d;if(content.isConnected)render();}).catch(()=>{session={enabled:false,user:null};if(content.isConnected)render();});
 }
 function draw(){
  dialog.replaceChildren();const header=make('div',null,'settings-header'),h=make('h2',tr('إعدادات زَمَكان','ZAMAKAN settings'));h.id='settings-title';const close=make('button','×');close.setAttribute('aria-label',tr('إغلاق','Close'));close.onclick=()=>dialog.close();header.append(h,close);dialog.append(header);
  const section=make('section',null,'settings-section');section.append(make('h3',tr('اللغة والمظهر','Language & appearance')));
  choice(section,tr('لغة التطبيق','Application language'),'lang',[['ar','العربية'],['en','English']]);choice(section,tr('المظهر','Theme'),'theme',[['dark',tr('داكن','Dark')],['light',tr('فاتح','Light')]]);choice(section,tr('حجم الخط','Text size'),'font',[['standard',tr('قياسي','Standard')],['large',tr('كبير','Large')]]);choice(section,tr('الحركة','Motion'),'motion',[['system',tr('إعداد النظام','System')],['reduced',tr('حركة أقل','Reduced')]]);
  const l=make('label',null,'setting-toggle'),c=make('input');c.type='checkbox';c.checked=state.preferences.auto;c.onchange=()=>{state.preferences.auto=c.checked;apply();};l.append(c,document.createTextNode(tr('تحديث المصادر دوريًا حسب وتيرة كل مصدر','Refresh feeds periodically at source cadence')));section.append(l);const low=make('label',null,'setting-toggle'),lc=make('input');lc.type='checkbox';lc.checked=state.preferences.lowData;lc.onchange=()=>{state.preferences.lowData=lc.checked;apply();};low.append(lc,document.createTextNode(tr('وضع الاتصال الضعيف — تعطيل التحديث التلقائي','Low-data mode — pause automatic refresh')));section.append(low);dialog.append(section);account(dialog);
  const push=make('section',null,'settings-section');push.append(make('h3',tr('إشعارات البحث','Research notifications')));
  const pi=make('p',tr('إشعارات اختبارية اختيارية فقط — ليست تحذيرات طوارئ.','Optional research test notifications only — not emergency warnings.'),'muted');push.append(pi);
  const toggle=make('button',tr('الإشعارات غير مهيأة','Notifications not configured'));toggle.disabled=true;push.append(toggle);dialog.append(push);
  if(pushAvailable()){pushDetails().then(details=>{let enabled=!!details.enabled;if(Number.isFinite(details.lastReceived)&&details.lastReceived>0)pi.textContent=tr('آخر إشعار اختباري وصل: ','Last test notification received: ')+new Date(details.lastReceived).toLocaleString();const drawPush=()=>{toggle.textContent=enabled?tr('إيقاف الإشعارات','Disable notifications'):tr('تفعيل الإشعارات','Enable notifications');toggle.disabled=false;};drawPush();toggle.onclick=async()=>{toggle.disabled=true;try{await setPush(!enabled);enabled=!enabled;pi.textContent=tr('تم تحديث الاشتراك','Subscription updated');}catch(e){pi.textContent=tr('تعذر تحديث الاشتراك','Subscription update failed');}finally{drawPush();}};}).catch(()=>{});}
  const privacy=make('section',null,'settings-section'),privacyLink=make('a',tr('سياسة الخصوصية وحذف البيانات','Privacy policy and data deletion'));privacyLink.href='./privacy.html';privacy.append(privacyLink);dialog.append(privacy);
  dialog.append(make('p',tr('الساعة تتحرك كل ثانية؛ لا تتغير القياسات إلا عند صدورها من المصدر.','Clock updates every second; measurements change only when published by sources.'),'muted'));
 }
 return {open(){draw();if(!dialog.open)dialog.showModal();}};
}
