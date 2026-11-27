"""Fetch selected global ECMWF fields; no Open-Meteo key required.
Run with ecmwf-opendata, eccodes and numpy installed.
Output is a coarse global grid, not a live observation.
"""
import argparse
import json
import tempfile
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
from ecmwf.opendata import Client
from eccodes import codes_grib_new_from_file, codes_get, codes_get_array, codes_release

def ingest(model, output):
    client = Client(source="ecmwf", model=model, resol="0p25")
    params = ["2t", "10u", "10v", "msl", "tp"]
    with tempfile.TemporaryDirectory() as tmp:
        target = str(Path(tmp) / "forecast.grib2")
        client.retrieve(stream="oper", type="fc", step=[0, 6, 12, 24, 48, 72], param=params, target=target)
        frames = {}
        with open(target, "rb") as f:
            while (gid := codes_grib_new_from_file(f)) is not None:
                try:
                    key = str(codes_get(gid, "shortName"))
                    step = str(codes_get(gid, "endStep"))
                    lat = codes_get_array(gid, "latitudes")
                    lon = codes_get_array(gid, "longitudes")
                    values = codes_get_array(gid, "values")
                    mask = (np.abs(lat - np.round(lat)) < 1e-5) & (np.abs(lon - np.round(lon)) < 1e-5)
                    grid = np.full((181, 360), np.nan)
                    grid[np.round(90-lat[mask]).astype(int), np.round(lon[mask]).astype(int)%360] = values[mask]
                    if not np.isfinite(grid).all():
                        raise ValueError("Incomplete global grid")
                    frame = frames.setdefault(step, {"runDate": int(codes_get(gid,"dataDate")), "runTime": int(codes_get(gid,"dataTime")), "fields": {}})
                    frame["fields"][key] = np.round(grid, 5).tolist()
                finally:
                    codes_release(gid)
        if not frames:
            raise ValueError("No forecast messages")
        payload = {"source": "ECMWF", "model": model, "retrieved": datetime.now(timezone.utc).isoformat(), "grid": {"north":90,"west":0,"spacing":1,"width":360,"height":181}, "frames":frames, "license":"CC BY 4.0"}
        output.parent.mkdir(parents=True, exist_ok=True)
        temp = output.with_suffix(".tmp")
        temp.write_text(json.dumps(payload, separators=(",",":"), allow_nan=False))
        temp.replace(output)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--model", choices=["ifs","aifs-single"], default="ifs")
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    ingest(a.model, a.output)
