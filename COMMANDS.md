# Useful Commands Reference

## Drizzle ORM Schema Management

### When you edit or add to the schema (src/db/schema.ts)

After modifying the schema file, you need to apply the changes to your database:

```bash
# Option 1: Generate migration files (recommended for production)
bunx drizzle-kit generate

# Option 2: Push changes directly to database (good for development)
bunx drizzle-kit push

# Option 3: Push with force (skip confirmation)
bunx drizzle-kit push --force
```

### Inside Docker container

```bash
# Push schema changes from inside the container
docker compose exec backend bunx drizzle-kit push

# Generate migrations inside container
docker compose exec backend bunx drizzle-kit generate

# View the database schema
docker compose exec backend bunx drizzle-kit studio
```

### Manual SQL execution (if Drizzle fails)

```bash
# Add a column manually
docker compose exec -T db psql -U postgres -d quizmock -c "ALTER TABLE users ADD COLUMN column_name TEXT;"

# Check table structure
docker compose exec -T db psql -U postgres -d quizmock -c "\d users"

# View all tables
docker compose exec -T db psql -U postgres -d quizmock -c "\dt"
```

---

## Docker Commands

### Starting/Stopping Containers

```bash
# Start all containers
docker compose up -d

# Start with rebuild
docker compose up -d --build

# Stop all containers
docker compose down

# Restart specific service
docker compose restart backend
docker compose restart db

# Stop and remove containers, networks, volumes
docker compose down -v
```

### Viewing Logs

```bash
# View all logs
docker compose logs

# View backend logs
docker compose logs backend

# View last 20 lines
docker compose logs backend --tail 20

# Follow logs in real-time
docker compose logs -f backend

# View database logs
docker compose logs db
```

### Container Management

```bash
# List running containers
docker compose ps

# Execute command in running container
docker compose exec backend bun --version

# Execute command without TTY (for scripts)
docker compose exec -T backend bun test

# Enter container shell
docker compose exec backend sh

# View container resource usage
docker stats
```

### Database Operations

```bash
# Access PostgreSQL shell
docker compose exec db psql -U postgres -d quizmock

# Run SQL query directly
docker compose exec -T db psql -U postgres -d quizmock -c "SELECT * FROM users;"

# Backup database
docker compose exec -T db pg_dump -U postgres quizmock > backup.sql

# Restore database
docker compose exec -T db psql -U postgres quizmock < backup.sql

# Drop all tables (careful!)
docker compose exec -T db psql -U postgres -d quizmock -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### Debugging

```bash
# Check container health
docker compose ps
docker inspect quizmock-backend

# View container resource usage
docker stats quizmock-backend

# Check container networks
docker network ls
docker network inspect quizmock-backend-hono-bun_default

# View container filesystem
docker compose exec backend ls -la /app

# Check environment variables in container
docker compose exec backend env

# Test database connection from backend
docker compose exec backend bun -e "console.log(process.env.DATABASE_URL)"
```

### Rebuilding

```bash
# Rebuild specific service
docker compose build backend

# Rebuild without cache
docker compose build --no-cache backend

# Full clean rebuild
docker compose down
docker compose build --no-cache
docker compose up -d

# Remove all unused images/containers
docker system prune -a
```

---

## Application Commands

### Development

```bash
# Run development server with watch mode
bun run dev

# Run production server
bun run start

# Run tests locally (won't work, needs Docker)
bun test

# Run tests in Docker
bun run test

# Watch mode tests in Docker
bun run test:watch
```

### Database Seeding

```bash
# Seed the database
bun run seed

# Seed from Docker
docker compose exec backend bun run src/db/seed.ts
```

### Code Formatting

```bash
# Format all files
bun run format

# Check formatting without changing files
bun run format:check

# Format specific file
bunx prettier --write src/index.ts
```

---

## Testing & Debugging

### API Testing with curl

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get profile (replace TOKEN)
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"

# Check response headers
curl -I http://localhost:3000/health
```

### Database Queries

```bash
# Count users
docker compose exec -T db psql -U postgres -d quizmock -c "SELECT COUNT(*) FROM users;"

# View all users (without passwords)
docker compose exec -T db psql -U postgres -d quizmock -c "SELECT id, name, email, created_at FROM users;"

# Find user by email
docker compose exec -T db psql -U postgres -d quizmock -c "SELECT * FROM users WHERE email = 'john@example.com';"

# Delete all users
docker compose exec -T db psql -U postgres -d quizmock -c "TRUNCATE TABLE users RESTART IDENTITY CASCADE;"
```

---

## Troubleshooting

### Common Issues

#### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
# Or on Windows
netstat -ano | findstr :3000

# Kill the process
kill -9 PID
```

#### Permission denied on drizzle folder
```bash
# Fix permissions
sudo chown -R $USER:$USER drizzle/
# Or run migrations in Docker
docker compose exec backend bunx drizzle-kit push
```

#### Database connection issues
```bash
# Check if database is running
docker compose ps db

# Check database logs
docker compose logs db

# Test connection
docker compose exec backend bun -e "const { db } = require('./src/db/client'); console.log('Connected');"
```

#### Container won't start
```bash
# View full logs
docker compose logs backend

# Remove and rebuild
docker compose down
docker compose up -d --build

# Check for port conflicts
docker compose ps
lsof -i :3000
```

#### Cache issues
```bash
# Clear Docker build cache
docker builder prune

# Remove all stopped containers and unused images
docker system prune -a

# Fresh start
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

---

## Quick Reference

### After Schema Changes
```bash
# 1. Edit src/db/schema.ts
# 2. Push to database
docker compose exec backend bunx drizzle-kit push
# 3. Restart if needed
docker compose restart backend
```

### Fresh Database Setup
```bash
# 1. Stop everything
docker compose down -v

# 2. Start fresh
docker compose up -d

# 3. Apply schema
docker compose exec backend bunx drizzle-kit push

# 4. Seed data (optional)
docker compose exec backend bun run src/db/seed.ts
```

### Quick Debug Workflow
```bash
# 1. Check logs
docker compose logs backend --tail 50

# 2. Check database
docker compose exec -T db psql -U postgres -d quizmock -c "\dt"

# 3. Test endpoint
curl http://localhost:3000/health

# 4. Restart if needed
docker compose restart backend
```
