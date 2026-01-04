# Azure PostgreSQL Flexible Server Provisioning for CAPS360

# 1. Create Azure PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group caps360 \
  --name caps360-pg \
  --location southafricanorth \
  --admin-user capsadmin \
  --admin-password <REPLACE_WITH_STRONG_PASSWORD> \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0-255.255.255.255

# 2. Create the 'caps360' database
az postgres flexible-server db create \
  --resource-group caps360 \
  --server-name caps360-pg \
  --database-name caps360

# 3. Create least-privilege app user (run in psql)
# Replace <PG_HOST> and <ADMIN_PASSWORD> with your values
psql "host=<PG_HOST> dbname=postgres user=capsadmin password=<ADMIN_PASSWORD> sslmode=require"

-- In psql prompt:
CREATE USER capsapp WITH PASSWORD '<REPLACE_WITH_STRONG_PASSWORD>';
GRANT CONNECT ON DATABASE caps360 TO capsapp;
\c caps360
GRANT USAGE ON SCHEMA public TO capsapp;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO capsapp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO capsapp;

# 4. Import schema/data (see migration SQL script)
# Use pg_dump/pg_restore or psql for import
