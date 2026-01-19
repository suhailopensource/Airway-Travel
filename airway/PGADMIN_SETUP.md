# pgAdmin Setup Guide

## Overview

pgAdmin is a web-based administration tool for PostgreSQL. It provides a graphical interface to view and manage your database.

## Starting pgAdmin

### Start pgAdmin Container

```bash
cd airway
docker compose up -d pgadmin
```

Or start all services:
```bash
docker compose up -d
```

### Check Status

```bash
docker compose ps pgadmin
```

## Accessing pgAdmin

1. **Open your browser** and navigate to:
   ```
   http://localhost:5050
   ```

2. **Login with default credentials**:
   - **Email**: `admin@airway.com`
   - **Password**: `admin`

   ⚠️ **Security Note**: Change these credentials in production!

## Connecting to PostgreSQL Database

After logging in, you need to add a server connection:

### Step 1: Add New Server

1. Right-click on **"Servers"** in the left sidebar
2. Select **"Register" → "Server..."**

### Step 2: General Tab

- **Name**: `Airway Database` (or any name you prefer)

### Step 3: Connection Tab

Fill in the following details:

- **Host name/address**: `postgres` (Docker service name)
- **Port**: `5432`
- **Maintenance database**: `airway_db`
- **Username**: `airway_user`
- **Password**: `airway_password`
- **Save password**: ✅ (check this box)

### Step 4: Save

Click **"Save"** to connect.

## Viewing Database Data

Once connected, you can:

### Browse Tables

1. Expand **"Servers" → "Airway Database" → "Databases" → "airway_db" → "Schemas" → "public" → "Tables"**
2. You'll see all your tables:
   - `users`
   - `flights`
   - `bookings`
   - etc.

### View Table Data

1. Right-click on any table (e.g., `users`)
2. Select **"View/Edit Data" → "All Rows"**
3. You'll see all the data in that table

### Run SQL Queries

1. Right-click on **"airway_db"** database
2. Select **"Query Tool"**
3. Write your SQL queries:
   ```sql
   SELECT * FROM users;
   SELECT * FROM flights;
   SELECT * FROM bookings;
   ```

### View Table Structure

1. Right-click on any table
2. Select **"Properties"**
3. Go to **"Columns"** tab to see column definitions

## Quick Reference

### Connection Details

| Field | Value |
|------|-------|
| **Host** | `postgres` |
| **Port** | `5432` |
| **Database** | `airway_db` |
| **Username** | `airway_user` |
| **Password** | `airway_password` |

### pgAdmin Access

| Field | Value |
|------|-------|
| **URL** | `http://localhost:5050` |
| **Email** | `admin@airway.com` |
| **Password** | `admin` |

## Common Operations

### View All Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Count Records in Each Table

```sql
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 
  'flights', COUNT(*) FROM flights
UNION ALL
SELECT 
  'bookings', COUNT(*) FROM bookings;
```

### View Recent Bookings

```sql
SELECT 
  b.id,
  b."seatCount",
  b.status,
  b."totalPrice",
  u.name as user_name,
  u.email as user_email,
  f."flightNumber",
  f.source,
  f.destination
FROM bookings b
JOIN users u ON b."userId" = u.id
JOIN flights f ON b."flightId" = f.id
ORDER BY b."createdAt" DESC
LIMIT 10;
```

### View Flight Availability

```sql
SELECT 
  id,
  "flightNumber",
  source,
  destination,
  "departureTime",
  "totalSeats",
  "availableSeats",
  (SELECT COUNT(*) FROM bookings WHERE "flightId" = f.id AND status = 'CONFIRMED') as confirmed_bookings,
  status
FROM flights f
ORDER BY "departureTime" ASC;
```

## Troubleshooting

### Cannot Connect to Server

**Error**: "Unable to connect to server"

**Solutions**:
1. Make sure PostgreSQL is running:
   ```bash
   docker compose ps postgres
   ```

2. Check if pgAdmin can reach PostgreSQL:
   ```bash
   docker compose exec pgadmin ping postgres
   ```

3. Verify PostgreSQL is healthy:
   ```bash
   docker compose exec postgres pg_isready -U airway_user
   ```

### pgAdmin Not Loading

**Error**: Page won't load at `http://localhost:5050`

**Solutions**:
1. Check if pgAdmin container is running:
   ```bash
   docker compose ps pgadmin
   ```

2. Check logs:
   ```bash
   docker compose logs pgadmin
   ```

3. Restart pgAdmin:
   ```bash
   docker compose restart pgadmin
   ```

### Forgot Password

If you need to reset pgAdmin password:

1. Stop pgAdmin:
   ```bash
   docker compose stop pgadmin
   ```

2. Remove pgAdmin volume (⚠️ This will delete all saved connections):
   ```bash
   docker compose down pgadmin
   docker volume rm airway_pgadmin_data
   ```

3. Start pgAdmin again:
   ```bash
   docker compose up -d pgadmin
   ```

## Changing pgAdmin Credentials

To change the default email/password, edit `docker-compose.yml`:

```yaml
pgadmin:
  environment:
    PGADMIN_DEFAULT_EMAIL: your-email@example.com
    PGADMIN_DEFAULT_PASSWORD: your-secure-password
```

Then restart:
```bash
docker compose up -d pgadmin
```

## Stopping pgAdmin

```bash
docker compose stop pgadmin
```

Or stop all services:
```bash
docker compose down
```

## Useful pgAdmin Features

### 1. Query Tool
- Write and execute SQL queries
- View results in a table format
- Export results to CSV/JSON

### 2. Data Export/Import
- Export table data to CSV, JSON, SQL
- Import data from files

### 3. Backup/Restore
- Create database backups
- Restore from backup files

### 4. Table Designer
- Visual table structure editor
- Add/modify columns, constraints, indexes

### 5. Dashboard
- View database statistics
- Monitor connections
- See table sizes

## Security Best Practices

1. **Change Default Credentials**: Update `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD` in production
2. **Use Strong Passwords**: Don't use default passwords in production
3. **Limit Access**: Only expose pgAdmin port in development
4. **Use HTTPS**: In production, set up reverse proxy with SSL

## Next Steps

1. Start pgAdmin: `docker compose up -d pgadmin`
2. Access at: `http://localhost:5050`
3. Login with: `admin@airway.com` / `admin`
4. Add server connection using the details above
5. Start exploring your database!

Happy database exploring! 🗄️

