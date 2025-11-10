# Starta PIM-lösningen

## Snabbstart

### 1. Kör migrationer (lägger till saknade tabeller)

Projektet använder den befintliga databasen `mc-parts`. Kör migrationer för att lägga till eventuella saknade tabeller:

```bash
# Från projektets root
bun run db:push
```

Eller använd start-skriptet:
```bash
chmod +x /workspace/start-database.sh
/workspace/start-database.sh
```

**Notera:** Befintliga tabeller och data påverkas inte - endast saknade tabeller läggs till.

### 2. Starta servrarna

**Alternativ 1: Starta båda från root (rekommenderat)**
```bash
# Från projektets root - startar både server och web
bun run dev
```

**Alternativ 2: Starta separat**

**Terminal 1 - Backend (tRPC API):**
```bash
# Från root
bun run dev:server
```
Eller från server-mappen:
```bash
cd apps/server
bun run dev
```
Körs på: http://localhost:3000

**Terminal 2 - Frontend (Web UI):**
```bash
# Från root
bun run dev:web
```
Eller från web-mappen:
```bash
cd apps/web
bun run dev
```
Körs på: http://localhost:3001

### 3. Öppna admin-gränssnittet

Öppna webbläsaren och gå till: **http://localhost:3001/admin**

## Verifiera att allt fungerar

- ✅ Web UI: http://localhost:3001/admin
- ✅ API: http://localhost:3000/trpc/attributeDefinition.list?input={}

## Databaskonfiguration

Databasanslutningen är konfigurerad i `apps/server/.env.local`:
```
DATABASE_URL=postgresql://danadalis@localhost:5432/mc-parts
```

## Viktigt: Detta är ett Bun-projekt

- Använd `bun` istället för `npm`
- Installera dependencies: `bun install` (från root)
- Kör scripts: `bun run <script>` eller `bun <script>`
- Bun laddar automatiskt `.env`-filer, inget behov av `dotenv`

## Felsökning

Om databasen inte fungerar:
1. Kontrollera att PostgreSQL körs: `psql -h localhost -U danadalis -d mc-parts -c "SELECT 1;"`
2. Kontrollera att `.env.local` har rätt DATABASE_URL
3. Kör migrationer manuellt: `bun run db:push` (från root)

Om servrarna inte startar:
1. Kontrollera att portarna 3000 och 3001 är lediga
2. Kontrollera att `.env.local`-filerna är korrekt konfigurerade
3. Installera dependencies: `bun install` (från root)
4. Kontrollera att Bun är installerat: `bun --version`
