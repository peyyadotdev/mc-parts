#!/bin/bash
set -e

echo "Starting PostgreSQL with Docker..."
docker-compose up -d postgres

echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo "Checking database connection..."
until PGPASSWORD=postgres psql -h localhost -U postgres -d mc_parts -c "SELECT 1;" > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "Running database migrations..."
cd /workspace/apps/server
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mc_parts"
npm run db:push

echo "Database setup complete!"
echo ""
echo "You can now access:"
echo "  - Web UI: http://localhost:3001/admin"
echo "  - API: http://localhost:3000/trpc"
