# Ingestion service: polls worldcup26.ir for live match scores/events and
# publishes them to the match-events topic. The worldcup26.ir JWT is read
# directly from Secret Manager at runtime by the app code (not injected as
# a Cloud Run env var) — see backend/src/ingestion-service/worldcup26-client.ts.
#
# NOTE on polling interval: Cloud Scheduler's minimum granularity is 1
# minute (the schedule below), but live match data wants fresher updates
# (~15-30s). Per decision: the handler for POST /poll runs an internal loop
# that polls worldcup26.ir every 15-30s for ~50s before returning, so a
# 1-minute Scheduler cadence yields ~15-30s effective freshness without
# requiring an always-on (min_instance_count=1) instance between matches.
resource "google_cloud_run_v2_service" "ingestion_service" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = "ingestion-service"

  # INTERNAL_ONLY: this service is called exclusively by Cloud Scheduler
  # (via its OIDC-authenticated job below), never by the public internet or
  # fans directly. Restricting ingress removes an entire class of exposure.
  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  # This is a hackathon MVP that must tear down cleanly with a single
  # `terraform destroy` — no manual deletion-protection overrides required.
  deletion_protection = false

  template {
    service_account = google_service_account.ingestion_service.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.ingestion_service_image

      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = tostring(google_redis_instance.cache.port)
      }
      env {
        name  = "MATCH_EVENTS_TOPIC"
        value = google_pubsub_topic.match_events.name
      }
      env {
        name  = "STAND_STATUS_TOPIC"
        value = google_pubsub_topic.stand_status.name
      }
      env {
        name = "WEATHER_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.weather_api_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  # CI/CD or `gcloud run deploy` owns the deployed image after the first
  # apply; don't let a subsequent `terraform apply` revert a real build
  # back to the placeholder.
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.connector,
  ]
}

# Only Cloud Scheduler's own service account may invoke this INTERNAL_ONLY
# service.
resource "google_cloud_run_v2_service_iam_member" "ingestion_scheduler_invoker" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = google_cloud_run_v2_service.ingestion_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_service_account" "scheduler" {
  project      = var.gcp_project_id
  account_id   = "match-poll-scheduler"
  display_name = "Stadium Copilot - Cloud Scheduler (match polling)"
}

resource "google_cloud_scheduler_job" "poll_matches" {
  project  = var.gcp_project_id
  region   = var.gcp_region
  name     = "poll-match-events"
  schedule = "* * * * *" # every 1 minute — Cloud Scheduler's minimum granularity.

  http_target {
    uri         = "${google_cloud_run_v2_service.ingestion_service.uri}/poll"
    http_method = "POST"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = google_cloud_run_v2_service.ingestion_service.uri
    }
  }

  depends_on = [
    google_project_service.apis,
    google_cloud_run_v2_service_iam_member.ingestion_scheduler_invoker,
  ]
}
