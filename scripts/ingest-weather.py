"""Download genuine ECMWF or NOAA model data and atomically publish compact grids.
No API key; run on the owner's host or CI with permitted network access.
"""
import argparse
import json
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
import time
import numpy as np
from ecmwf.opendata import Client
from eccodes import codes_grib_new_from_file, codes_get, codes_get_array, codes_release
import requests

STEPS = [6, 12, 18, 24, 30, 36, 48, 60, 72]
PARAMS = ["2t", "10u", "10v", "sp", "msl", "tp", "tcc", "2d"]
ALIASES = {"t": "2t", "u": "10u", "v": "10v", "pres": "sp", "prmsl": "msl", "apcp": "tp"}
def read_grids(target, model):
    frames = {}
    run = None
    with open(target, "rb") as f:
        while (gid := codes_grib_new_from_file(f)) is not None:
            try:
                key = str(codes_get(gid, "shortName"))
                if model=="gfs":
                    level_type=str(codes_get(gid,"typeOfLevel"))
                    level=int(codes_get(gid,"level"))
                    if key in {"2t","2d","t","dpt"} and level_type=="heightAboveGround" and level==2: key="2d" if key in {"2d","dpt"} else "2t"
                    elif key in {"10u","10v","u","v"} and level_type=="heightAboveGround" and level==10: key="10u" if key in {"10u","u"} else "10v"
                    elif key in {"sp","pres"} and level_type=="surface": key="sp"
                    elif key in {"msl","prmsl"} and level_type=="meanSea": key="msl"
                    elif key in {"tp","apcp"} and level_type=="surface": key="tp"
                    elif key in {"tcc","tcdc"} and level_type=="entireAtmosphere": key="tcc"
                    else: continue
                elif model=="cams":
                    if key not in {"pm10","pm2p5","pm2_5"}: continue
                    key="pm2_5" if key=="pm2p5" else key
                else: key = ALIASES.get(key, key)
                step = int(codes_get(gid, "endStep"))
                date = str(codes_get(gid, "dataDate"))
                clock = f"{int(codes_get(gid, 'dataTime')):04d}"
                stamp = datetime.strptime(date+clock, "%Y%m%d%H%M").replace(tzinfo=timezone.utc)
                if run is not None and run != stamp:
                    raise ValueError("Mixed model runs")
                run = stamp
                lat = codes_get_array(gid, "latitudes")
                lon = codes_get_array(gid, "longitudes")
                values = codes_get_array(gid, "values")
                if model=="cams":
                    units=str(codes_get(gid,"units"))
                    if "kg" not in units or "m" not in units: raise ValueError("Unexpected CAMS units")
                mask = (np.abs(lat-np.round(lat))<1e-5)&(np.abs(lon-np.round(lon))<1e-5)
                grid = np.full((181,360), np.nan)
                if model=="cams":
                    # Nearest sampling from the original regular lat/lon grid.
                    ys=np.unique(lat); xs=np.unique(lon%360)
                    if len(ys)*len(xs)!=len(values): raise ValueError("CAMS requires regular lat/lon GRIB")
                    arr=np.full((len(ys),len(xs)),np.nan)
                    arr[np.searchsorted(ys,lat),np.searchsorted(xs,lon%360)]=values
                    iy=np.abs(ys[:,None]-np.arange(90,-91,-1)[None,:]).argmin(axis=0)
                    delta=np.abs(xs[:,None]-np.arange(360)[None,:])
                    ix=np.minimum(delta,360-delta).argmin(axis=0)
                    grid=arr[iy[:,None],ix[None,:]]*1e9
                else:
                    grid[np.round(90-lat[mask]).astype(int), np.round(lon[mask]).astype(int)%360] = values[mask]
                grid[(~np.isfinite(grid))|(np.abs(grid)>1e15)] = np.nan
                if int(codes_get(gid,"bitmapPresent")): grid[grid==float(codes_get(gid,"missingValue"))]=np.nan
                if key in {"swh","mwd","mwp"}: grid[(grid<0)|(grid>=9999)]=np.nan
                units=str(codes_get(gid,"units"))

                if key in {"2t","2d"}: grid -= 273.15
                if key in {"sp","msl"}: grid /= 100
                if key=="tp" and model!="gfs":
                    # IFS uses metres, some AIFS fields use kg m^-2 (equivalent mm).
                    if units=="m": grid *= 1000
                    elif not ("kg" in units or units=="mm"): raise ValueError("Unexpected precipitation units "+units)
                if key=="tp" and model=="gfs": continue
                if key=="tcc" and model!="gfs":
                    if units in {"(0 - 1)","1","fraction"}: grid *= 100
                    elif units!="%": raise ValueError("Unexpected cloud units "+units)
                    grid[(grid<0)|(grid>100.01)]=np.nan
                # Never turn missing ocean/land cells into zero.
                flattened = [round(float(v),3) if np.isfinite(v) else None for v in grid.ravel()]
                fields = frames.setdefault(step, {})
                if key in fields: raise ValueError("Duplicate model field: "+key)
                fields[key] = flattened
            finally:
                codes_release(gid)
    if not frames: raise ValueError("No data")
    result=[]
    for step, fields in sorted(frames.items()):
        if model in {"ifs","aifs-single","gfs"} and not {"2t","10u","10v","sp"}.issubset(fields):
            raise ValueError("Incomplete atmospheric frame")
        # Keep accumulated precipitation distinct, retain the interval in metadata.
        result.append({"time":(run+timedelta(hours=step)).isoformat(),"leadHours":step,"fields":fields})
    return {"version":1,"model":model,"source":"NOAA GFS" if model=="gfs" else "Copernicus CAMS" if model=="cams" else "ECMWF","run":run.isoformat(),"retrieved":datetime.now(timezone.utc).isoformat(),"grid":{"north":90,"west":0,"spacing":1,"width":360,"height":181},"frames":result}

def retrieve_gfs(target):
    now=datetime.now(timezone.utc)-timedelta(hours=6)
    now=now.replace(hour=now.hour//6*6,minute=0,second=0,microsecond=0)
    day,cycle=now.strftime("%Y%m%d"),now.strftime("%H")
    with open(target,"wb") as out:
        for lead in STEPS:
            p={"dir":f"/gfs.{day}/{cycle}/atmos","file":f"gfs.t{cycle}z.pgrb2.1p00.f{lead:03d}","lev_2_m_above_ground":"on","lev_10_m_above_ground":"on","lev_surface":"on","lev_mean_sea_level":"on","lev_entire_atmosphere":"on","var_TMP":"on","var_DPT":"on","var_UGRD":"on","var_VGRD":"on","var_PRES":"on","var_PRMSL":"on","var_APCP":"on","var_TCDC":"on"}
            # Restrict messages by level below, since NOMADS applies a cross product.
            r=requests.get("https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_1p00.pl",params=p,timeout=(15,120));r.raise_for_status()
            if not r.content.startswith(b"GRIB"): raise ValueError("NOAA response is not GRIB")
            out.write(r.content)
            time.sleep(2)

def ingest(model, output, input_file=None):
    with tempfile.TemporaryDirectory() as tmp:
        target=str(Path(tmp)/"forecast.grib2")
        if input_file: target=str(input_file)
        elif model=="gfs": retrieve_gfs(target)
        elif model=="cams": raise ValueError("CAMS requires licensed original GRIB supplied with --input")
        else:
            client=Client(source="ecmwf",model="ifs" if model=="wave" else model,resol="0p25")
            client.retrieve(stream="wave" if model=="wave" else "oper",type="fc",step=STEPS,param=["swh","mwd","mwp"] if model=="wave" else PARAMS,target=target)
        payload=read_grids(target,model)
        output.parent.mkdir(parents=True,exist_ok=True)
        temp=output.with_suffix(".tmp")
        temp.write_text(json.dumps(payload,separators=(",",":"),allow_nan=False))
        temp.replace(output)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--model",choices=["ifs","aifs-single","gfs","wave","cams"],default="ifs")
    p.add_argument("--output",type=Path,required=True)
    p.add_argument("--input",type=Path)
    a=p.parse_args()
    ingest(a.model,a.output,a.input)
