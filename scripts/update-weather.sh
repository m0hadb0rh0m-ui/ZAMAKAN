#!/bin/sh
# Bounded refresh, no credentials. Keep last successful atomic snapshot.
set -eu
dir="${WEATHER_DATA_DIR:-weather-data}"
mkdir -p "$dir"
python scripts/ingest-weather.py --model ifs --output "$dir/ifs.json" || python scripts/ingest-weather.py --model gfs --output "$dir/gfs.json"
python scripts/ingest-weather.py --model aifs-single --output "$dir/aifs-single.json" || echo "AIFS update unavailable" >&2
python scripts/ingest-weather.py --model wave --output "$dir/wave.json" || echo "Wave update unavailable" >&2
