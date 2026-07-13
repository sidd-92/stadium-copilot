# Firestore: native mode, single database per project. Stores match state,
# stand status, and order records.
resource "google_firestore_database" "default" {
  project     = var.gcp_project_id
  name        = "(default)"
  location_id = var.gcp_region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis]
}

# Memorystore Redis: caches live match scores/events for low-latency reads
# by both services (avoids hammering Firestore on every poll/request).
resource "google_redis_instance" "cache" {
  project        = var.gcp_project_id
  region         = var.gcp_region
  name           = "stadium-copilot-cache"
  tier           = "BASIC" # MVP doesn't need HA replicas; BASIC is cheapest and sufficient for a demo.
  memory_size_gb = 1

  # DIRECT_PEERING (rather than the default PRIVATE_SERVICE_ACCESS) requires
  # us to explicitly pin the authorized network. It must be the exact same
  # VPC network the Serverless VPC connector attaches to, or Cloud Run
  # won't be able to route to Redis's internal IP.
  connect_mode       = "DIRECT_PEERING"
  authorized_network = "default"

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.connector,
  ]
}
