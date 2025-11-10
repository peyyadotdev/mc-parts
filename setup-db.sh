#!/bin/bash
set -e

# Start PostgreSQL
sudo -u postgres /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main > /tmp/postgres.log 2>&1 &
sleep 5

# Create database
export PGPASSWORD=postgres
psql -h localhost -U postgres -c "CREATE DATABASE mc_parts;" 2>&1 || echo "Database may already exist"

# Run migrations
cd /workspace/apps/server
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mc_parts"
npm run db:push

echo "Database setup complete!"
