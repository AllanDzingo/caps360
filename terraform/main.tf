# CAPS360 Infrastructure - Main Configuration

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Generate secure JWT secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "firestore.googleapis.com",
    "storage-api.googleapis.com",
  ])
  
  service            = each.value
  disable_on_destroy = false
}

# Create Firestore database
resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
  
  depends_on = [google_project_service.required_apis]
}

# Create Cloud Storage bucket for content
resource "google_storage_bucket" "content_bucket" {
  name          = "${var.project_id}-content"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  cors {
    origin          = ["https://${var.project_id}.web.app", "http://localhost:5173"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  depends_on = [google_project_service.required_apis]
}

# Create secrets in Secret Manager
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "jwt_secret_version" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "gemini_api_key_version" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = var.gemini_api_key != "" ? var.gemini_api_key : "PLACEHOLDER-ADD-YOUR-KEY"
}

# Payment secrets (testing mode)
resource "google_secret_manager_secret" "payfast_merchant_id" {
  secret_id = "payfast-merchant-id"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "payfast_merchant_id_version" {
  secret      = google_secret_manager_secret.payfast_merchant_id.id
  secret_data = "TESTING-MODE"
}

resource "google_secret_manager_secret" "payfast_merchant_key" {
  secret_id = "payfast-merchant-key"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "payfast_merchant_key_version" {
  secret      = google_secret_manager_secret.payfast_merchant_key.id
  secret_data = "TESTING-MODE"
}

resource "google_secret_manager_secret" "payfast_passphrase" {
  secret_id = "payfast-passphrase"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "payfast_passphrase_version" {
  secret      = google_secret_manager_secret.payfast_passphrase.id
  secret_data = "TESTING-MODE"
}

resource "google_secret_manager_secret" "paystack_secret_key" {
  secret_id = "paystack-secret-key"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "paystack_secret_key_version" {
  secret      = google_secret_manager_secret.paystack_secret_key.id
  secret_data = "TESTING-MODE"
}

# Service account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "caps360-backend"
  display_name = "CAPS360 Backend Service Account"
}

# Grant permissions to service account
resource "google_project_iam_member" "cloud_run_sa_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_sa_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_sa_secrets" {
  for_each = toset([
    "jwt-secret",
    "gemini-api-key",
    "payfast-merchant-id",
    "payfast-merchant-key",
    "payfast-passphrase",
    "paystack-secret-key",
  ])
  
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
  
  depends_on = [
    google_secret_manager_secret.jwt_secret,
    google_secret_manager_secret.gemini_api_key,
    google_secret_manager_secret.payfast_merchant_id,
    google_secret_manager_secret.payfast_merchant_key,
    google_secret_manager_secret.payfast_passphrase,
    google_secret_manager_secret.paystack_secret_key,
  ]
}

# Cloud Run service for backend
resource "google_cloud_run_service" "backend" {
  name     = "caps360-api"
  location = var.region
  
  template {
    spec {
      service_account_name = google_service_account.cloud_run_sa.email
      
      containers {
        image = "gcr.io/${var.project_id}/caps360-backend:latest"
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
        
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }
        
        env {
          name  = "GCP_REGION"
          value = var.region
        }
        
        env {
          name  = "GCS_BUCKET_NAME"
          value = google_storage_bucket.content_bucket.name
        }
        
        env {
          name  = "PAYSTACK_ENABLED"
          value = "false"
        }
        
        env {
          name  = "PAYFAST_ENABLED"
          value = "false"
        }
        
        env {
          name = "JWT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.jwt_secret.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "GEMINI_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.gemini_api_key.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "PAYFAST_MERCHANT_ID"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.payfast_merchant_id.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "PAYFAST_MERCHANT_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.payfast_merchant_key.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "PAYSTACK_SECRET_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.paystack_secret_key.secret_id
              key  = "latest"
            }
          }
        }
      }
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "0"
        "autoscaling.knative.dev/maxScale" = "10"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_secret_manager_secret_version.jwt_secret_version,
    google_secret_manager_secret_version.gemini_api_key_version,
  ]
  
  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image,
    ]
  }
}

# Make Cloud Run service publicly accessible
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.backend.name
  location = google_cloud_run_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
