# Secret Manager containers only — NOT values. Actual API key values are
# added out-of-band after `terraform apply` via:
#   gcloud secrets versions add worldcup26-jwt-token --data-file=-
#   gcloud secrets versions add weather-api-key --data-file=-
# This keeps secret material out of .tf files, tfvars, and Terraform state
# entirely; Terraform only ever manages the secret "shell" and IAM on it.

# worldcup26.ir issues an 84-day JWT via a one-time /auth/register or
# /auth/authenticate call made by a human, not by this service — the
# ingestion service only ever reads the current value at runtime via the
# Secret Manager API (see backend/src/ingestion-service/worldcup26-client.ts).
resource "google_secret_manager_secret" "worldcup26_jwt_token" {
  project   = var.gcp_project_id
  secret_id = "worldcup26-jwt-token"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "weather_api_key" {
  project   = var.gcp_project_id
  secret_id = "weather-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}
