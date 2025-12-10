# CAPS360 Infrastructure - Variables

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "caps360"
}

variable "region" {
  description = "GCP Region for resources"
  type        = string
  default     = "africa-south1"
}

variable "gemini_api_key" {
  description = "Google Gemini API Key (optional, can be updated later)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
