const byId=id=>document.getElementById(id),confirmBox=byId('confirm'),erase=byId('erase'),status=byId('status'),signin=byId('signin');
let active=false;
function draw(){erase.disabled=!active||!confirmBox.checked;}
confirmBox.onchange=draw;
async function request(path,body){const r=await fetch('./api/auth/'+path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Request failed');return r.json();}
request('session').then(d=>{if(d.provider==='chatgpt'){active=!!d.user;signin.hidden=active;status.textContent=active?'تم تسجيل الدخول / Signed in':'سجّل الدخول أولًا / Sign in first';}else status.textContent='إدارة الحساب المحلي داخل الإعدادات / Manage self-hosted account in Settings';draw();}).catch(()=>{status.textContent='الخدمة غير متاحة؛ استخدم موقع زَمَكان السحابي / Service unavailable; use the hosted ZAMAKAN site';});
erase.onclick=async()=>{if(!active||!confirmBox.checked)return;erase.disabled=true;try{const d=await request('delete',{confirm:true});if(d.ok!==true)throw Error('Delete not confirmed');status.textContent='تم حذف النسخة السحابية / Cloud copy deleted';confirmBox.checked=false;}catch{status.textContent='تعذر الحذف، حاول مجددًا / Deletion failed; try again';}finally{draw();}};
