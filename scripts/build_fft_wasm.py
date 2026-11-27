"""Reproducible minimal WebAssembly radix-2 butterfly stage. No compiler dependency."""
from pathlib import Path
def u(n):
    b=[]
    while n>=128: b.append((n&127)|128); n>>=7
    return bytes(b+[n])
def s(n):
    b=[]
    while True:
        v=n&127;n>>=7
        done=(n==0 and not v&64) or (n==-1 and v&64)
        b.append(v if done else v|128)
        if done:return bytes(b)
def vec(*items):return u(len(items))+b''.join(items)
def sec(i,b):return bytes([i])+u(len(b))+b
def name(t):return u(len(t))+t.encode()
def op(i,*args):return bytes([i])+b''.join(args)
def get(i):return op(0x20,u(i))
def put(i,x):return x+op(0x21,u(i))
def const(n):return op(0x41,s(n))
def add(a,b):return a+b+b'\x6a'
def mul(a,b):return a+b+b'\x6c'
def load(a,off=0):return a+op(0x2b,u(3),u(off))
def store(a,v,off=0):return a+v+op(0x39,u(3),u(off))
def f(a,b,code):return a+b+bytes([code])
# stage(n,half,stride,twiddleBase): i,j,a,b,t; r,k,ar,ai.
n,h,stride,tw=map(get,range(4))
i,j,a,b,t=map(get,range(4,9))
r,k,ar,ai=map(get,range(9,13))
body=put(4,const(0))+b'\x02\x40\x03\x40'
body+=i+n+const(1)+b'\x76\x4f\x0d\x01' # break when i >= n/2
body+=put(5,i+h+b'\x70') # unsigned remainder
body+=put(6,mul(add(i,i+h+b'\x6e'+h+b'\x6c'),const(16))) # a=(i+(i/half)*half)*16
body+=put(7,add(a,mul(h,const(16))))
body+=put(8,add(tw,mul(mul(j,stride),const(16))))
body+=put(9,f(f(load(b),load(t),0xa2),f(load(b,8),load(t,8),0xa2),0xa1))
body+=put(10,f(f(load(b),load(t,8),0xa2),f(load(b,8),load(t),0xa2),0xa0))
body+=put(11,load(a))+put(12,load(a,8))
body+=store(b,f(ar,r,0xa1))+store(b,f(ai,k,0xa1),8)+store(a,f(ar,r,0xa0))+store(a,f(ai,k,0xa0),8)
body+=put(4,add(i,const(1)))+b'\x0c\x00\x0b\x0b\x0b'
code=vec(u(5)+b'\x7f',u(4)+b'\x7c')+body
wasm=b'\0asm\x01\0\0\0'+sec(1,vec(b'\x60'+vec(*[b'\x7f']*4)+vec()))+sec(3,vec(u(0)))+sec(5,vec(b'\x00'+u(24)))+sec(7,vec(name('memory')+b'\x02\x00',name('stage')+b'\x00\x00'))+sec(10,vec(u(len(code))+code))
Path('src/fft-kernel.wasm').write_bytes(wasm)
