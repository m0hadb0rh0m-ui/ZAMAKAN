// Manual sender: no secrets in source, no broadcast outside the opted-in research topic.
export async function sendResearchTest({project,token,send=false,fetcher=fetch}){
 if(!/^[a-z][a-z0-9-]{4,29}$/.test(project||'')||!token)throw Error('Firebase project ID and short-lived OAuth credential required');
 const r=await fetcher('https://fcm.googleapis.com/v1/projects/'+project+'/messages:send',{
  method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({validate_only:!send,message:{topic:'zamakan_research_updates',data:{type:'research-test'},android:{priority:'NORMAL',ttl:'300s'}}}),
  signal:AbortSignal.timeout(20000)
 });
 if(!r.ok)throw Error('FCM rejected request: HTTP '+r.status);
 const data=await r.json();if(typeof data.name!=='string')throw Error('FCM response missing message reference');
 return {accepted:true,mode:send?'sent-to-opted-in-research-topic':'validation-only',note:'API acceptance does not prove device delivery.'};
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url){
 const result=await sendResearchTest({project:process.env.FIREBASE_PROJECT_ID,token:process.env.FCM_ACCESS_TOKEN,send:process.env.FCM_SEND==='true'});console.log(JSON.stringify(result));
}
