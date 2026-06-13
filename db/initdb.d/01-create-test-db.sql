-- Runs once on first volume initialization (docker-entrypoint-initdb.d).
-- Creates the database used by the Vitest suite so tests never touch the dev DB.
-- To recreate after dropping the volume: `pnpm db:down -v && pnpm db:up`.
CREATE DATABASE mhventanas_test OWNER mhventanas;
