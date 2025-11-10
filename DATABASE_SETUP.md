# Database Setup Instructions

## Använd befintlig databas

Projektet använder den befintliga databasen `mc-parts` med användaren `danadalis`.

Konfiguration finns i `apps/server/.env`:
```
DATABASE_URL=postgresql://danadalis@localhost:5432/mc-parts
```

**Viktigt:** Detta är separerat från root `.env.local` som hanterar nyehandel-koppling (NYE_* variabler).

## Kör migrationer

Kör migrationer för att lägga till eventuella saknade tabeller (befintliga tabeller och data påverkas inte):

```bash
# Från projektets root
bun run db:push
```

Eller från server-mappen:
```bash
cd apps/server
bun run db:push
```

Eller använd start-skriptet:
```bash
chmod +x /workspace/start-database.sh
/workspace/start-database.sh
```

## Verifiera att allt fungerar

- Web UI: http://localhost:3001/admin
- API: http://localhost:3000/trpc/attributeDefinition.list?input={}

## Notera

- Den befintliga databasen och dess innehåll bevaras
- `db:push` lägger bara till saknade tabeller, ändrar inte befintliga
- Detta är ett **Bun-projekt** - använd `bun` istället för `npm`
