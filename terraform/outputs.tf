# CAPS360 Infrastructure - Outputs

output "backend_url" {
  description = "Cloud Run backend service URL"
  value       = google_cloud_run_service.backend.status[0].url
}

output "content_bucket_name" {
  description = "Cloud Storage bucket for content"
  value       = google_storage_bucket.content_bucket.name
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.database.name
}

output "service_account_email" {
  description = "Backend service account email"
  value       = google_service_account.cloud_run_sa.email
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

output "frontend_url" {
  description = "Firebase Hosting URL"
  value       = "https://${var.project_id}.web.app"
}

output "deployment_commands" {
  description = "Commands to deploy application code"
  value = <<-EOT
    # Deploy Backend
    cd backend
    gcloud builds submit --tag gcr.io/${var.project_id}/caps360-backend:latest
    gcloud run services update caps360-api --image gcr.io/${var.project_id}/caps360-backend:latest --region ${var.region}
    
    # Deploy Frontend
    cd frontend-web
    npm run build
    firebase deploy --only hosting --project ${var.project_id}
    
    # Create Admin User
    cd ..
    node backend/scripts/create-admin.js
  EOT
}
