-- Proposed database only, not a deployed migration.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE data_source (
 id text PRIMARY KEY, official_url text NOT NULL, license_url text,
 coverage text, ttl_seconds integer CHECK (ttl_seconds > 0)
);
CREATE TABLE observation (
 source_id text REFERENCES data_source(id), external_id text NOT NULL,
 observed_at timestamptz NOT NULL, retrieved_at timestamptz NOT NULL,
 geom geography(Point,4326) NOT NULL,
 kind text NOT NULL CHECK(kind IN ('observed','forecast','reported','estimated','historical','simulation')),
 category text NOT NULL, value double precision, units text,
 verification text, spatial_resolution_m double precision, temporal_resolution_s integer,
 uncertainty jsonb, expires_at timestamptz, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 PRIMARY KEY(source_id,external_id,observed_at)
);
CREATE INDEX observation_geo_idx ON observation USING gist(geom);
CREATE INDEX observation_time_idx ON observation(observed_at DESC);
