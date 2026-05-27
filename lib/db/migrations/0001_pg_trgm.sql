CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS lifter_name_trgm_idx ON lifter USING gin (name gin_trgm_ops);
