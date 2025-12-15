resource "google_iam_workload_identity_pool" "fly_io_pool" {
  workload_identity_pool_id = "fly-io-pool"
  display_name              = "Fly.io Identity Pool"
  description               = "Identity pool for Fly.io workloads"
  disabled                  = false
}

resource "google_iam_workload_identity_pool_provider" "fly_io_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.fly_io_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "fly-io-provider"
  display_name                       = "Fly.io Provider"
  description                        = "OIDC provider for Fly.io"
  attribute_mapping = {
    "google.subject" = "assertion.sub"
    "attribute.app"  = "assertion.app"
    "attribute.env"  = "assertion.env"
  }
  oidc {
    issuer_uri = "https://api.fly.io"
  }
}

# Allow the Fly.io identity to impersonate the backend service account
# This allows ANY Fly.io app in your org to impersonate if we just check "attribute.app"
# For better security, you could restrict to specific app: "assertion.app == 'your-fly-app-name'"
resource "google_service_account_iam_member" "fly_io_impersonation" {
  service_account_id = google_service_account.cloud_run_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.fly_io_pool.name}/attribute.env/production"
}

# Also allow accessing the pool (sometimes needed)
resource "google_project_iam_member" "fly_io_pool_user" {
  project = var.project_id
  role    = "roles/iam.workloadIdentityUser"
  member  = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.fly_io_pool.name}/attribute.env/production"
}
