# Starta PIM-lösningen

## Snabbstart

### 1. Starta databasen (Docker)

```bash
docker-compose up -d postgres
```

Eller använd start-skriptet:
```bash
chmod +x /workspace/start-database.sh
/workspace/start-database.sh
```

### 2. Starta servrarna

I två separata terminaler:

**Terminal 1 - Backend (tRPC API):**
```bash
cd /workspace/apps/server
npm run dev
```
Körs på: http://localhost:3000

**Terminal 2 - Frontend (Web UI):**
```bash
cd /workspace/apps/web
npm run dev
```
Körs på: http://localhost:3001

### 3. Öppna admin-gränssnittet

Öppna webbläsaren och gå till: **http://localhost:3001/admin**

## Verifiera att allt fungerar

- ✅ Web UI: http://localhost:3001/admin
- ✅ API: http://localhost:3000/trpc/attributeDefinition.list?input={}

## Felsökning

Om databasen inte fungerar:
1. Kontrollera att Docker-containern körs: `docker ps | grep postgres`
2. Kontrollera loggar: `docker logs postgres-pim`
3. Kör migrationer manuellt: `cd /workspace/apps/server && npm run db:push`

Om servrarna inte startar:
1. Kontrollera att portarna 3000 och 3001 är lediga
2. Kontrollera att `.env.local`-filerna är korrekt konfigurerade
3. Kontrollera att alla dependencies är installerade: `npm install` i båda app-mapparna
