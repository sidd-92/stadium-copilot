variable "gcp_project_id" {
  description = "GCP project ID for Stadium Copilot"
  type        = string
}

variable "gcp_region" {
  description = "Default GCP region for provisioned resources"
  type        = string
  default     = "us-central1"
}
