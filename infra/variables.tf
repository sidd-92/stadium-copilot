variable "gcp_project_id" {
  description = "GCP project ID for Stadium Copilot"
  type        = string
}

variable "gcp_region" {
  description = "Default GCP region for provisioned resources"
  type        = string
  default     = "us-central1"
}

# Defaults to Google's public hello-world image so `terraform apply` can
# provision the Cloud Run services before any real image has been pushed
# to Artifact Registry. Once CI/CD or `gcloud run deploy` pushes a real
# build, that deploy updates the running revision directly — Terraform
# ignores drift on this field (see lifecycle blocks in ingestion.tf /
# order_service.tf) so re-running `terraform apply` won't revert it.
variable "ingestion_service_image" {
  description = "Container image for the ingestion Cloud Run service"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "order_service_image" {
  description = "Container image for the order Cloud Run service"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}
