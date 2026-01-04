| Variable         | Local (.env) Example                        | Azure App Service Setting         | Description                       |
|------------------|---------------------------------------------|-----------------------------------|-----------------------------------|
| NODE_ENV         | development                                 | production                        | Node.js environment               |
| PORT             | 8080                                        | 8080                              | App port (default 8080)           |
| DATABASE_URL     | postgresql://user:pass@localhost:5432/caps360| <AZURE_PG_CONN_STRING>            | PostgreSQL connection string      |
| JWT_SECRET       | your-local-jwt-secret                       | <Key Vault ref or value>          | JWT signing secret                |
| JWT_EXPIRES_IN   | 7d                                          | 7d                                | JWT expiry                        |
| APPINSIGHTS_INSTRUMENTATIONKEY | (not set)                     | <from App Insights>               | Application Insights key          |
| ...              | ...                                         | ...                               | ...                               |

- Store secrets (DB, JWT, API keys) in Azure Key Vault and reference from App Service where possible.
- Do not hardcode secrets in code or repo.
# CAPS360 Environment Variable Map

| Variable                | Local Example Value                                 | Azure Example Value / Source                | Description                                 |
|-------------------------|-----------------------------------------------------|---------------------------------------------|---------------------------------------------|
| PORT                    | 8080                                                | 80 (App Service default)                    | API server port                             |
| NODE_ENV                | development                                         | production                                  | Node environment                           |
| LOG_LEVEL               | info                                                | info                                        | Logging level                              |
| DB_HOST                 | localhost                                           | <azure-server>.postgres.database.azure.com  | PostgreSQL host                            |
| DB_PORT                 | 5432                                                | 5432                                        | PostgreSQL port                            |
| DB_USER                 | postgres                                            | <azure-db-user>@<azure-server>              | PostgreSQL user                            |
| DB_PASSWORD             | postgres                                            | (Key Vault secret)                          | PostgreSQL password                        |
| DB_NAME                 | caps360                                             | caps360                                     | PostgreSQL database name                   |
| DB_SSL                  | false                                               | true                                        | Use SSL for DB connection                  |
| DATABASE_URL            | postgresql://postgres:postgres@localhost:5432/caps360| (Azure connection string)                   | Full DB connection string (preferred)       |
| JWT_SECRET              | your-secret-key                                     | (Key Vault secret)                          | JWT signing secret                         |
| JWT_EXPIRES_IN          | 7d                                                  | 7d                                          | JWT expiry                                 |
| SUPABASE_URL            | (legacy, for Auth only)                             | (legacy, for Auth only)                     | Supabase Auth endpoint (to be removed)      |
| SUPABASE_ANON_KEY       | (legacy, for Auth only)                             | (legacy, for Auth only)                     | Supabase public key (to be removed)         |
| SUPABASE_SERVICE_ROLE_KEY| (legacy, for Auth only)                            | (legacy, for Auth only)                     | Supabase service key (to be removed)        |
| GEMINI_API_KEY          | your-gemini-api-key                                 | (Key Vault secret)                          | Gemini AI API key                          |
| GEMINI_MODEL            | gemini-1.5-flash                                    | gemini-1.5-flash                            | Gemini model name                          |
| PAYFAST_MERCHANT_ID     |                                                     | (Key Vault secret)                          | PayFast merchant ID                        |
| PAYFAST_MERCHANT_KEY    |                                                     | (Key Vault secret)                          | PayFast merchant key                       |
| PAYFAST_PASSPHRASE      |                                                     | (Key Vault secret)                          | PayFast passphrase                         |
| PAYFAST_SANDBOX         | true                                                | false                                       | Use PayFast sandbox                        |
| PAYSTACK_SECRET_KEY     |                                                     | (Key Vault secret)                          | Paystack secret key                        |
| PAYSTACK_PUBLIC_KEY     |                                                     | (Key Vault secret)                          | Paystack public key                        |
| STUDY_HELP_PRICE        | 3900                                                | 3900                                        | Study help price (cents)                   |
| STANDARD_PRICE          | 9900                                                | 9900                                        | Standard plan price (cents)                |
| PREMIUM_PRICE           | 14900                                               | 14900                                       | Premium plan price (cents)                 |
| TRIAL_DURATION_DAYS     | 14                                                  | 14                                          | Free trial duration (days)                 |
| WELCOME_PREMIUM_DAYS    | 14                                                  | 14                                          | Welcome premium duration (days)            |
| RATE_LIMIT_WINDOW_MS    | 900000                                              | 900000                                      | Rate limit window (ms)                     |
| RATE_LIMIT_MAX_REQUESTS | 100                                                 | 100                                         | Max requests per window                    |
| APPINSIGHTS_INSTRUMENTATIONKEY |                                             | (App Insights)                              | Application Insights key                   |
| AZURE_AD_B2C_CLIENT_ID  |                                                     | (Azure AD B2C)                              | Azure AD B2C client ID                     |
| AZURE_AD_B2C_TENANT     |                                                     | (Azure AD B2C)                              | Azure AD B2C tenant                        |
| AZURE_AD_B2C_CLIENT_SECRET |                                                 | (Key Vault secret)                          | Azure AD B2C client secret                 |
| AZURE_AD_B2C_POLICY     |                                                     | (Azure AD B2C)                              | Azure AD B2C policy                        |

- All secrets should be stored in Azure Key Vault and injected as environment variables in App Service.
- Remove Supabase variables after auth migration is complete.

_Last updated: December 2025_