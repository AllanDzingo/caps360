# CAPS360 Azure Database Migration Instructions

## 1. Provision Azure PostgreSQL Flexible Server
See `docs/azure-db-provisioning.md` for CLI commands and user setup.

## 2. Export Supabase Data
- Use `pg_dump` to export schema and data from Supabase:
  ```
  pg_dump --schema=public --no-owner --no-privileges --format=plain \
    --dbname=postgresql://<supabase_user>:<supabase_password>@<supabase_host>:5432/postgres \
    > supabase_export.sql
  ```

## 3. Import to Azure PostgreSQL
- Use `psql` to import schema and data:
  ```
  psql "host=<PG_HOST> dbname=caps360 user=capsadmin password=<ADMIN_PASSWORD> sslmode=require" < supabase_export.sql
  ```
- Or use the migration script in `docs/azure-db-migration.sql` for a clean schema.

## 4. Create App User
- See `docs/azure-db-provisioning.md` for SQL to create `capsapp` user and grant privileges.

## 5. Update Backend Config
- Set the new Azure PostgreSQL connection string in your environment variables or Azure Key Vault.

## 6. Validate
- Run backend scripts (e.g., `check-tables.ts`) to confirm DB connectivity and schema.

---

**Note:**
- Use strong passwords for all DB users.
- Restrict public access as soon as possible.
- Review and adapt schema for any Supabase-specific types or extensions.
