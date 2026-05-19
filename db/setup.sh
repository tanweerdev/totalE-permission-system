#!/usr/bin/env bash

set -euo pipefail

DB_NAME="${1:-totale}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

if psql -d "$POSTGRES_DB" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  echo "Database '$DB_NAME' already exists."
else
  echo "Creating database '$DB_NAME'..."
  createdb "$DB_NAME"
fi

echo "Running db/init.sql on '$DB_NAME'..."
psql -d "$DB_NAME" -f "$(dirname "$0")/init.sql"

echo "Database '$DB_NAME' is ready."
