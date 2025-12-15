output "project_number" {
  description = "The numeric ID of the project, used for WIF configuration"
  value       = data.google_project.current.number
}

output "wif_audience" {
  description = "Audience string for WIF configuration"
  value       = "//iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/fly-io-pool/providers/fly-io-provider"
}

output "service_account_impersonation_url" {
  description = "URL for service account impersonation"
  value       = "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${google_service_account.cloud_run_sa.email}:generateAccessToken"
}
