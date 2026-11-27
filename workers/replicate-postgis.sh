#!/usr/bin/env bash
# Requires owner-provisioned PostgreSQL/PostGIS, osm2pgsql 2.x and a properly
# licensed PBF. Run init separately before this loop. PG* env/.pgpass only.
set -euo pipefail
: "${PGDATABASE:?Set the database name}"
while true; do
  if ! osm2pgsql-replication update -d "$PGDATABASE"; then
    echo "Replication failed; retrying without moving the checkpoint" >&2
  fi
  sleep 60
done
