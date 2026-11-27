-- Apply after the initial osm2pgsql pgsql import (planet_osm_polygon, EPSG:3857).
-- The DB must be continuously updated by osm2pgsql-replication.
-- Martin exposes this SQL function as a vector tile source named zamakan_buildings.
CREATE INDEX IF NOT EXISTS zamakan_buildings_geom ON planet_osm_polygon USING gist(way)
 WHERE building IS NOT NULL AND building <> 'no';
CREATE OR REPLACE FUNCTION public.zamakan_buildings(z integer,x integer,y integer)
RETURNS bytea LANGUAGE sql STABLE PARALLEL SAFE AS $$
 SELECT COALESCE(ST_AsMVT(tile,'building',4096,'geom'),''::bytea)
 FROM (
  SELECT osm_id,ST_AsMVTGeom(way,ST_TileEnvelope(z,x,y),4096,64,true) AS geom
  FROM planet_osm_polygon
  WHERE z BETWEEN 13 AND 20 AND building IS NOT NULL AND building <> 'no'
    AND way && ST_TileEnvelope(z,x,y,margin=>0.015625)
  LIMIT 20000
 ) AS tile WHERE geom IS NOT NULL
$$;
