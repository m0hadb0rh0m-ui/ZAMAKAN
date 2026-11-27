"""Black-box responses validated against the published OpenAPI 3.1 JSON schemas."""
import json, os, urllib.request, urllib.error, pathlib, secrets
from jsonschema import Draft202012Validator
base=os.environ.get('ZAMAKAN_URL','http://127.0.0.1:4173')
doc=json.loads(pathlib.Path('public/openapi.json').read_text())
def call(path,method='GET',body=None,expected=200,origin=None,cookie=None):
    operation=doc['paths'][path][method.lower()]
    headers={}
    if body is not None:
        schema=operation['requestBody']['content']['application/json']['schema']
        Draft202012Validator(schema).validate(body)
        headers['Content-Type']='application/json'
    if method=='POST': headers.setdefault('Content-Type','application/json')
    if origin:headers['Origin']=origin
    if cookie:headers['Cookie']=cookie
    req=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else (b'' if method=='POST' else None),headers=headers,method=method)
    try: r=urllib.request.urlopen(req,timeout=30)
    except urllib.error.HTTPError as e:r=e
    with r:
        assert r.status==expected,(path,r.status,expected)
        assert 'application/json' in r.headers['Content-Type']
        data=json.load(r)
        schema=operation['responses'][str(r.status)]['content']['application/json']['schema']
        Draft202012Validator(schema).validate(data)
        return data,r.headers.get('Set-Cookie')
for path in ['/health','/api/flags','/api/status','/api/auth/session','/api/ai/status']:
    data,_=call(path)
    if path=='/api/status':assert data['mode']==os.environ.get('ZAMAKAN_SOURCE_MODE','mock')
    if path=='/api/auth/session':enabled=data['enabled']
call('/api/ai/chat','POST',{'prompt':'test'},403,base)
payload={'username':'contract_'+secrets.token_hex(4),'password':'local-test-password-123'}
if enabled:
    _,cookie=call('/api/auth/register','POST',payload,201,base)
    assert cookie and 'HttpOnly' in cookie and 'SameSite=Strict' in cookie
    cookie=cookie.split(';')[0]
    assert call('/api/auth/session',cookie=cookie)[0]['user']['username']==payload['username']
    call('/api/auth/logout','POST',expected=200,origin=base,cookie=cookie)
    call('/api/auth/login','POST',payload,200,base)
else:
    call('/api/auth/register','POST',payload,503,base)
    call('/api/auth/login','POST',payload,503,base)
print('OpenAPI contract checks passed')
