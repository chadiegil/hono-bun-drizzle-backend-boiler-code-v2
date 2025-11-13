
To install dependencies:
```
bun install 
```
```
docker compose exec quizmock-backend bun install
```


To run:
```
docker compose exec quizmock-backend bun run dev
```

open http://localhost:3000


# Drizzle commands

Generate the migration
```
 docker compose exec quizmock-backend bunx drizzle-kit generate
```

Apply the new migration to database
```
 docker compose exec quizmock-backend bunx drizzle-kit push
```

Applying seeder
```
docker compose exec quizmock-backend bun run src/db/seed.ts
```