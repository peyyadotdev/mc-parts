# Database Setup Instructions

## Snabbstart med Docker

Kör detta kommando för att starta PostgreSQL och köra migrationer:

```bash
chmod +x /workspace/start-database.sh
/workspace/start-database.sh
```

Eller manuellt:

```bash
# Starta PostgreSQL med Docker Compose
docker-compose up -d postgres

# Vänta tills databasen är redo
sleep 5

# Kör migrationer
cd /workspace/apps/server
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mc_parts"
npm run db:push
```

## Verifiera att allt fungerar

- Web UI: http://localhost:3001/admin
- API: http://localhost:3000/trpc/attributeDefinition.list?input={}

## Alternativ: Använd Supabase

Om du har en Supabase-instans, uppdatera `apps/server/.env.local`:

```
DATABASE_URL=postgresql://user:password@host:5432/database
```
