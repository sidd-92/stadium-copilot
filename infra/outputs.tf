output "ingestion_service_url" {
  description = "Internal URL of the ingestion Cloud Run service"
  value       = google_cloud_run_v2_service.ingestion_service.uri
}

output "order_service_url" {
  description = "Public URL of the order Cloud Run service"
  value       = google_cloud_run_v2_service.order_service.uri
}

output "redis_host" {
  description = "Internal IP of the Memorystore Redis instance"
  value       = google_redis_instance.cache.host
}

output "artifact_registry_repo" {
  description = "Full path of the backend Artifact Registry Docker repo"
  value       = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.backend.repository_id}"
}

output "firebase_hosting_site_id" {
  description = "Firebase Hosting site ID for the frontend"
  value       = google_firebase_hosting_site.frontend.site_id
}
