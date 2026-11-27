import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sendResearchTest} from '../scripts/send-fcm-test.mjs';
test('FCM sends data-only to opted-in research topic, defaults to validate-only',async()=>{
 const r=await sendResearchTest({project:'zamakan-fixture',token:'test',fetcher:async(url,o)=>{assert.equal(url,'https://fcm.googleapis.com/v1/projects/zamakan-fixture/messages:send');const body=JSON.parse(o.body);assert.equal(body.validate_only,true);assert.equal(body.message.topic,'zamakan_research_updates');assert.deepEqual(body.message.data,{type:'research-test'});assert.equal(body.message.notification,undefined);return Response.json({name:'fixture'});}});assert.equal(r.mode,'validation-only');
 await assert.rejects(sendResearchTest({project:'../bad',token:'t'}),/required/);
 await assert.rejects(sendResearchTest({project:'zamakan-fixture',token:'t',fetcher:async()=>new Response(null,{status:401})}),/HTTP 401/);
});
