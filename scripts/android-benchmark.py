#!/usr/bin/env python3
"""Capture raw measurements on a connected physical Android phone, not an emulator."""
import argparse, json, pathlib, shutil, subprocess, sys, time, uuid
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--serial',help='ADB serial of the explicitly selected physical phone')
p.add_argument('--seconds',type=int,default=300,help='Manual interaction duration (seconds)')
p.add_argument('--out',type=pathlib.Path,default=pathlib.Path('android-benchmark-results'))
p.add_argument('--perfetto',action='store_true',help='Capture a 30-second device-wide Perfetto trace (may contain private process names; keep local)')
a=p.parse_args()
if a.seconds<60: p.error('Allow at least 60 seconds of interaction')
if not shutil.which('adb'): sys.exit('BLOCKED: adb unavailable; install Android platform-tools and connect a physical phone.')
devices=[line.split() for line in subprocess.check_output(['adb','devices','-l'],text=True).splitlines()[1:] if line.strip()]
ready=[d[0] for d in devices if len(d)>1 and d[1]=='device']
if a.serial:
    if a.serial not in ready: sys.exit('BLOCKED: requested device absent or unauthorized')
    serial=a.serial
elif len(ready)==1: serial=ready[0]
else: sys.exit('BLOCKED: connect one authorized phone or pass --serial')
def adb(*args,raw=False):
    result=subprocess.run(['adb','-s',serial,*args],capture_output=True,check=True)
    return result.stdout if raw else result.stdout.decode(errors='replace')
def shell(*args): return adb('shell',*args).strip()
if serial.startswith('emulator-') or any(shell('getprop',k)=='1' for k in ('ro.kernel.qemu','ro.boot.qemu')):
    sys.exit('BLOCKED: emulator is not a physical-device benchmark')
package='org.zamakan.earth'
if 'package:' not in shell('pm','path',package): sys.exit('BLOCKED: install the signed test APK first')
a.out.mkdir(parents=True,exist_ok=True)
meta={'model':shell('getprop','ro.product.model'),'android':shell('getprop','ro.build.version.release'),'webview':shell('dumpsys','webviewupdate'),'duration_seconds':a.seconds,'manual_gestures':['pinch zoom','rotate','drag','GPS permission/location','2D/3D','style switch'],'note':'Raw diagnostics only; gfxinfo may omit WebView GPU frames. Battery percentage alone does not prove energy efficiency. Unplug charging for comparable battery tests.'}
def capture(prefix):
    for label,args in {'battery':['dumpsys','battery'],'batterystats':['dumpsys','batterystats','--charged',package],'memory':['dumpsys','meminfo',package],'frames':['dumpsys','gfxinfo',package,'framestats'],'thermal':['dumpsys','thermalservice']}.items():
        try: (a.out/f'{prefix}-{label}.txt').write_text(shell(*args))
        except subprocess.CalledProcessError: (a.out/f'{prefix}-{label}.txt').write_text('Unavailable')
    (a.out/f'{prefix}-screen.png').write_bytes(adb('exec-out','screencap','-p',raw=True))
shell('monkey','-p',package,'-c','android.intent.category.LAUNCHER','1')
input('Open the map, grant location if appropriate, ensure no private content is visible; press Enter to start. ')
shell('dumpsys','gfxinfo',package,'reset')
capture('before')
print('Perform manual gestures listed in metadata for',a.seconds,'seconds. Keep network and brightness fixed.',flush=True)
if a.perfetto:
    trace='/data/misc/perfetto-traces/zamakan-'+uuid.uuid4().hex+'.perfetto-trace'
    print('Perfetto: perform the gestures repeatedly for the first 30 seconds.',flush=True)
    start=time.monotonic()
    try:
        adb('shell','perfetto','-o',trace,'-t','30s','-b','64mb','sched','freq','gfx','view','webview','input','power')
        adb('pull',trace,str(a.out/'gesture.perfetto-trace'))
        meta['perfetto']='recorded; inspect locally with Perfetto UI'
    except subprocess.CalledProcessError:
        meta['perfetto']='unavailable on this device'
    finally:
        try: shell('rm','-f',trace)
        except subprocess.CalledProcessError: pass
    time.sleep(max(0,a.seconds-(time.monotonic()-start)))
else:
    time.sleep(a.seconds)
capture('after')
meta['manual_observations']=input('Describe observed gesture lag, crashes, GPS results, and charging/thermal conditions: ')
(a.out/'metadata.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False))
print('Raw physical-device evidence saved to',a.out)
