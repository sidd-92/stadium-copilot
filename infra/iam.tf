# Two separate least-privilege service accounts, not one shared identity.
# ingestion-service only ever publishes events and reads secrets/Firestore;
# order-service only ever consumes events and serves fans. Sharing one SA
# would mean a compromise or bug in either service grants blast radius into
# the other's permissions (e.g. a bug in public-facing order-service could
# publish forged match events, or read the worldcup26.ir token it never needs).

resource "google_service_account" "ingestion_service" {
  project      = var.gcp_project_id
  account_id   = "ingestion-service"
  display_name = "Stadium Copilot - Ingestion Service"
}

resource "google_service_account" "order_service" {
  project      = var.gcp_project_id
  account_id   = "order-service"
  display_name = "Stadium Copilot - Order Service"
}

# --- ingestion-service ---

resource "google_project_iam_member" "ingestion_pubsub_publisher" {
  project = var.gcp_project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.ingestion_service.email}"
}

resource "google_project_iam_member" "ingestion_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.ingestion_service.email}"
}

resource "google_secret_manager_secret_iam_member" "ingestion_worldcup26_jwt_access" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.worldcup26_jwt_token.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.ingestion_service.email}"
}

resource "google_secret_manager_secret_iam_member" "ingestion_weather_api_key_access" {
  project   = var.gcp_project_id
  secret_id = google_secret_manager_secret.weather_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.ingestion_service.email}"
}

# --- order-service ---

resource "google_project_iam_member" "order_firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.order_service.email}"
}

resource "google_project_iam_member" "order_pubsub_subscriber" {
  project = var.gcp_project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.order_service.email}"
}

resource "google_project_iam_member" "order_aiplatform_user" {
  project = var.gcp_project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.order_service.email}"
}

# order-service must be allowed to invoke *itself*: the stand-status push
# subscription (messaging.tf) calls order-service's own /events/stand-status
# route using this SA's OIDC identity, so the SA needs run.invoker on the
# service it's also the runtime identity of.
resource "google_cloud_run_v2_service_iam_member" "order_service_self_invoker" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = google_cloud_run_v2_service.order_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.order_service.email}"
}
