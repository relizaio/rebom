CREATE SCHEMA IF NOT EXISTS rebom;

CREATE TABLE rebom.boms (
    uuid uuid NOT NULL UNIQUE PRIMARY KEY default gen_random_uuid(),
    created_date timestamptz NOT NULL default now(),
    last_updated_date timestamptz NOT NULL default now(),
    meta text NULL,
    bom jsonb NULL,
    tags jsonb NULL
);
