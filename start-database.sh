#!/bin/bash
set -e

echo "Checking database connection to existing database..."
cd /workspace/apps/server

# Test connection to existing database
export DATABASE_URL="postgresql://danadalis@localhost:5432/mc-parts"
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✓ Connected to existing database: mc-parts"
else
  echo "✗ Could not connect to database. Please ensure PostgreSQL is running and the database exists."
  exit 1
fi

echo "Running database migrations (this will only add missing tables)..."
npm run db:push

echo "Database setup complete!"
echo ""
echo "You can now access:"
echo "  - Web UI: http://localhost:3001/admin"
echo "  - API: http://localhost:3000/trpc"
