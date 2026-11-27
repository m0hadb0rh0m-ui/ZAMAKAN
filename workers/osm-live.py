#!/usr/bin/env python3
"""Consume actual OSM minute replication files; checkpoint and publish atomically.
Observes explicit building-labelled OSM edits, NOT building construction or remote sensing.
"""
import argparse, gzip, io, json, os, pathlib, time, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
BASE="https://planet.osm.org/replication/minute/"
LIMIT=32*1024*1024
def download(path,limit=LIMIT):
    req=urllib.request.Request(BASE+path,headers={'User-Agent':'ZAMAKAN replication worker/1.0 (https://github.com/m0hadb0rh0m-ui/ZAMAKAN)'})
    with urllib.request.urlopen(req,timeout=30) as response:
        data=response.read(limit+1)
        if len(data)>limit: raise ValueError('upstream size limit')
        return data
def state(data):
    items=dict(line.split('=',1) for line in data.decode().splitlines() if '=' in line and not line.startswith('#'))
    seq=int(items['sequenceNumber']); stamp=items['timestamp'].replace('\\:',':')
    datetime.fromisoformat(stamp.replace('Z','+00:00'))
    if not 0<=seq<=999999999: raise ValueError('invalid sequence')
    return seq,stamp
def sequence_path(seq):
    s=f'{seq:09d}'; return '/'.join((s[:3],s[3:6],s[6:]))
def parse_changes(compressed,seq):
    with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as f:
        raw=f.read(128*1024*1024+1)
    if len(raw)>128*1024*1024 or b'<!' in raw: raise ValueError('unsafe or oversized XML')
    root=ET.fromstring(raw)
    if root.tag!='osmChange': raise ValueError('invalid OSM diff')
    counts={'create':0,'modify':0,'delete':0}; recent=[]
    for group in root:
        if group.tag not in counts: continue
        for obj in group:
            if obj.tag not in ('way','relation'): continue
            tags={t.get('k'):t.get('v') for t in obj.findall('tag')}
            # Deletes and edits that remove building tags are not reliably classifiable from diff alone.
            if not tags.get('building') or tags.get('building')=='no': continue
            ident=int(obj.get('id')); version=int(obj.get('version','0'))
            if ident<=0 or version<1: continue
            counts[group.tag]+=1
            recent.append({'osmType':obj.tag,'id':ident,'version':version,'operation':group.tag,'editedAt':obj.get('timestamp'),'building':tags['building'],'sequence':seq})
    return counts,recent[-100:]
def update(out,max_steps=10):
    latest,latest_stamp=state(download('state.txt',65536))
    try:
        old=json.loads(out.read_text())
        checkpoint=int(old['appliedSequence'])
        if checkpoint>latest: raise ValueError('upstream regression')
    except FileNotFoundError:
        old={}; checkpoint=max(0,latest-1)
    if checkpoint==latest: return old
    total=dict(old.get('counts',{'create':0,'modify':0,'delete':0})); events=old.get('events',[])
    for seq in range(checkpoint+1,min(latest,checkpoint+max_steps)+1):
        prefix=sequence_path(seq)
        observed,stamp=state(download(prefix+'.state.txt',65536))
        if observed!=seq: raise ValueError('sequence mismatch')
        counts,items=parse_changes(download(prefix+'.osc.gz'),seq)
        for k,v in counts.items(): total[k]=total.get(k,0)+v
        events=(events+items)[-100:]
        result={'source':'OpenStreetMap / ODbL','kind':'map-edits','appliedSequence':seq,'sourceSequence':latest,'sourceTimestamp':latest_stamp,'processedTimestamp':stamp,'retrievedAt':datetime.now(timezone.utc).isoformat(),'counts':total,'lastBatch':counts,'events':events,'limits':'Explicit building tags only; no geometries; deletion and tag removal counts incomplete.'}
        temp=out.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False));os.replace(temp,out)
        old=result
    return old
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',default=os.environ.get('OSM_LIVE_FILE','./data/osm-live.json'));p.add_argument('--once',action='store_true');a=p.parse_args()
    out=pathlib.Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
    while True:
        try:
            x=update(out);print('OSM checkpoint',x.get('appliedSequence'),flush=True)
        except Exception as e:
            print('OSM upstream unavailable:',type(e).__name__,flush=True)
            if a.once: raise
        if a.once: break
        time.sleep(60)
