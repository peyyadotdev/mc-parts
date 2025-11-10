# Database Setup Instructions

## Problem
Servrarna körs men databasen är inte konfigurerad. PostgreSQL behöver startas och tabellerna behöver skapas.

## Lösning

### 1. Starta PostgreSQL

```bash
# Starta PostgreSQL (kör som postgres-användare)
sudo -u postgres /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main &
```

Eller om systemd fungerar:
```bash
sudo systemctl start postgresql
```

### 2. Skapa databasen

```bash
export PGPASSWORD=postgres
psql -h localhost -U postgres -c "CREATE DATABASE mc_parts;"
```

### 3. Kör migrationer

```bash
cd /workspace/apps/server
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mc_parts"
npm run db:push
```

### 4. Verifiera att servrarna fungerar

- Web UI: http://localhost:3001/admin
- API: http://localhost:3000/trpc/attributeDefinition.list?input={}

## Alternativ: Använd Supabase

Om du har en Supabase-instans, uppdatera `apps/server/.env.local`:

```
DATABASE_URL=postgresql://user:password@host:5432/database
```
