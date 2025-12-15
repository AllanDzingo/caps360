# Workload Identity Federation (WIF) setup for Caps360

This guide walks through creating a Workload Identity Pool and OIDC provider, creating a deploy service account, and granting permissions so GitHub Actions can mint short-lived access tokens for deployments without storing long-lived keys.

> Note: You must have Project Owner / Org Admin privileges to run the gcloud commands below.

## High-level overview

1. Create a Workload Identity Pool and an OIDC provider that trusts GitHub Actions tokens.
2. Create a service account (e.g., `caps360-deploy@...`) that the pool can impersonate.
3. Grant `roles/iam.workloadIdentityUser` to the pool (or to a principal set scoped to your GitHub repo).
4. Add repository secrets in GitHub for the provider resource name and service account email.
5. Create a GitHub Actions workflow that uses `google-github-actions/auth` to authenticate via WIF, then runs `gcloud auth print-access-token`, sets that token in Fly (`GCP_ACCESS_TOKEN`), and deploys.

---

## Commands (fill in values)

Replace the placeholders below:
- PROJECT_ID: your GCP project id (e.g. "my-gcp-project")
- PROJECT_NUMBER: numeric project number (use `gcloud projects describe` or in Cloud Console)
- POOL_ID: e.g. `caps360-pool`
- PROVIDER_ID: e.g. `github-provider`
- GITHUB_OWNER: GitHub org or user that owns the repository
- GITHUB_REPO: repository name (e.g. `caps360`)


### 1) Create workload identity pool

```bash
gcloud iam workload-identity-pools create "PO OL_ID" \
  --project="PROJECT_ID" \
  --location="global" \
  --display-name="Caps360 GitHub Actions Pool"
```

### 2) Create OIDC provider for GitHub Actions

The issuer for GitHub Actions is `https://token.actions.githubusercontent.com`.

```bash
gcloud iam workload-identity-pools providers create-oidc "PROVIDER_ID" \
  --project="PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="POOL_ID" \
  --display-name="GitHub OIDC Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --allowed-audiences="api://github.com/${GITHUB_OWNER}/${GITHUB_REPO}"
```

> The value of `--allowed-audiences` should match the audience your GitHub Action will present. For repo-scoped providers you can use `api://github.com/OWNER/REPO`.

### 3) Create the deploy service account

```bash
gcloud iam service-accounts create caps360-deploy \
  --project="PROJECT_ID" \
  --description="Service account for GitHub Actions deployments"
```

### 4) Grant the pool permission to impersonate the service account

Use the `principalSet` for the repository to limit access to your specific repo.

```bash
gcloud iam service-accounts add-iam-policy-binding caps360-deploy@${PROJECT_ID}.iam.gserviceaccount.com \
  --project="PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_OWNER}/${GITHUB_REPO}"
```

### 5) Save the provider resource name and SA email to GitHub secrets

Get the full provider resource name (required by google-github-actions/auth):

```bash
gcloud iam workload-identity-pools providers describe "PROVIDER_ID" \
  --workload-identity-pool="POOL_ID" \
  --location="global" \
  --project="PROJECT_ID" \
  --format="value(name)"
```

Place the returned string into a repository secret named `WIF_PROVIDER`.

Also add a secret `WIF_SA` with the service account email (e.g., `caps360-deploy@PROJECT_ID.iam.gserviceaccount.com`).

**Also add in the repository secrets:**
- `FLY_API_TOKEN` — a Fly personal access token used by the deploy workflow.
- `GCP_PROJECT_ID` — your GCP project id.

### 6) Use the provided GitHub Actions workflow

This repo includes `.github/workflows/deploy-backend-wif.yml` which:
- Authenticates to GCP using `google-github-actions/auth` and the `WIF_PROVIDER`/`WIF_SA` secrets
- Runs `gcloud auth print-access-token` to obtain a short-lived access token
- Sets `GCP_ACCESS_TOKEN` in Fly secrets and then runs `flyctl deploy`

This keeps credentials short-lived (no long-lived JSON keys stored in repo or secrets).

---

## Validation

After the workflow runs, the backend should start and pick up the `GCP_ACCESS_TOKEN` from Fly's secrets. You can verify by checking the backend logs in Fly and running the included `scripts/check-gcp-access.ps1` locally to test Firestore/Storage access.

If you prefer a temporary service account key (not recommended for production with Org Policies), you can still set `GCP_SERVICE_ACCOUNT_KEY` or `GCP_SERVICE_ACCOUNT_KEY_B64` in Fly secrets; the backend supports both.

---

If you want, I can (with your permission) run the gcloud commands for you or generate a script you can run locally — tell me what names you'd like to use for the pool/provider and I will prepare the exact commands.