# Single Docker repo for backend container images (ingestion-service and
# order-service both push here, tagged separately by image name).
resource "google_artifact_registry_repository" "backend" {
  provider = google-beta

  project       = var.gcp_project_id
  location      = var.gcp_region
  repository_id = "stadium-copilot-backend"
  description   = "Backend container images for Stadium Copilot (ingestion-service, order-service)"
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}
