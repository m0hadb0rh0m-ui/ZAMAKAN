// Server/operator only. Validate by default; --send transmits fixed research-test data to consenting subscribers.
import {createSign} from 'node:crypto';
const raw=process.env.FCM_SERVICE_ACCOUNT_JSON;if(!raw)throw Error('FCM_SERVICE_ACCOUNT_JSON missing');
const a=JSON.parse(raw),project=a.project_id;if(!/^[a-z][a-z0-9-]{4,62}$/.test(project)||typeof a.client_email!=='string'||typeof a.private_key!=='string')throw Error('Invalid Firebase configuration');
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),now=Math.floor(Date.now()/1000);
const jwt=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:a.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+300});
const assertion=jwt+'.'+createSign('RSA-SHA256').update(jwt).sign(a.private_key).toString('base64url');
const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
if(!r.ok)throw Error('OAuth token request failed: '+r.status);
const {access_token}=await r.json();if(!access_token)throw Error('No access token');
const validate_only=!process.argv.includes('--send');
const resp=await fetch('https://fcm.googleapis.com/v1/projects/'+project+'/messages:send',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify({validate_only,message:{topic:'zamakan_research_updates',data:{type:'research-test'},android:{ttl:'60s',priority:'NORMAL'}}}),signal:AbortSignal.timeout(15000)});
if(!resp.ok)throw Error('FCM request failed: '+resp.status);console.log(validate_only?'FCM validation accepted (not sent)':'FCM test accepted, delivery is not guaranteed');
