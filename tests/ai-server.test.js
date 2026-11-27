import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';

test('local AI API checks same-origin and sends validated context to a mock Ollama',async()=>{
 const previous={HOST:process.env.HOST,PORT:process.env.PORT,ZAMAKAN_LOCAL_MODEL:process.env.ZAMAKAN_LOCAL_MODEL};
 let observed,app;
 const mock=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;observed=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:{content:'Synthetic response for test only'}}));});
 try{
  mock.listen(11434,'127.0.0.1');await once(mock,'listening');
  process.env.HOST='127.0.0.1';process.env.PORT='0';process.env.ZAMAKAN_LOCAL_MODEL='fixture-local';
  ({server:app}=await import('../server/index.js'));if(!app.listening)await once(app,'listening');
  const origin='http://127.0.0.1:'+app.address().port;
  assert.equal((await (await fetch(origin+'/api/ai/status')).json()).enabled,true);
  const body=JSON.stringify({prompt:'Explain the reading',context:{location:'secret',space:{state:'available',kp:3,time:'2026-01-01T00:00:00Z'}}});
  const req={method:'POST',headers:{'Content-Type':'application/json'},body};
  assert.equal((await fetch(origin+'/api/ai/chat',req)).status,403);
  const good=await fetch(origin+'/api/ai/chat',{...req,headers:{...req.headers,Origin:origin}});
  assert.equal(good.status,200);assert.equal((await good.json()).text,'Synthetic response for test only');
  assert.equal(observed.model,'fixture-local');assert.match(observed.messages[1].content,/"kp":3/);assert.ok(!observed.messages[1].content.includes('secret'));
 }finally{
  if(app?.listening){app.closeAllConnections();await new Promise(r=>app.close(r));}
  if(mock.listening){mock.closeAllConnections();await new Promise(r=>mock.close(r));}
  for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
});
