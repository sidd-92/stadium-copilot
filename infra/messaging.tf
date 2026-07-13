# Pub/Sub backbone connecting ingestion-service (publisher) to
# match-companion and order-service (subscribers).

resource "google_pubsub_topic" "match_events" {
  project = var.gcp_project_id
  name    = "match-events"

  depends_on = [google_project_service.apis]
}

resource "google_pubsub_topic" "stand_status" {
  project = var.gcp_project_id
  name    = "stand-status"

  depends_on = [google_project_service.apis]
}

# Dead-letter topic for stand-status: undeliverable incident messages land
# here after the push subscription exhausts its retry attempts, instead of
# being silently dropped.
resource "google_pubsub_topic" "stand_status_dlq" {
  project = var.gcp_project_id
  name    = "stand-status-dlq"

  depends_on = [google_project_service.apis]
}

# Pub/Sub needs explicit permission to publish into the DLQ topic and to
# ack/nack on behalf of the dead-lettering subscription.
resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  project = var.gcp_project_id
  topic   = google_pubsub_topic.stand_status_dlq.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_subscription_iam_member" "dlq_subscriber" {
  project      = var.gcp_project_id
  subscription = google_pubsub_subscription.stand_status_order_service.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# stand-status -> order-service: PUSH subscription, not pull. Order-service
# scales 0-10 and must be woken from zero the moment a stand closure or
# incident fires; a pull subscription would require an always-on consumer
# polling Pub/Sub, defeating scale-to-zero and costing money 24/7 even when
# no incidents are happening.
resource "google_pubsub_subscription" "stand_status_order_service" {
  project = var.gcp_project_id
  name    = "stand-status-order-service-push"
  topic   = google_pubsub_topic.stand_status.id

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.order_service.uri}/events/stand-status"

    # OIDC auth lets Pub/Sub prove to Cloud Run that the request really
    # came from this subscription, so INTERNAL/authenticated ingress on
    # order-service's push route can't be spoofed by an outside caller.
    oidc_token {
      service_account_email = google_service_account.order_service.email
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "60s"
  }

  # After 5 failed delivery attempts, stop retrying and shunt the message
  # to the DLQ so a persistently failing handler can't wedge the topic.
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.stand_status_dlq.id
    max_delivery_attempts = 5
  }

  ack_deadline_seconds = 30

  depends_on = [
    google_project_service.apis,
    google_cloud_run_v2_service.order_service,
  ]
}

# match-events -> match-companion: plain pull subscription. The
# match-companion path (websocket/notification fan-out) is fine polling
# Pub/Sub directly and doesn't need push-triggered wake-from-zero.
resource "google_pubsub_subscription" "match_events_match_companion" {
  project = var.gcp_project_id
  name    = "match-events-match-companion-pull"
  topic   = google_pubsub_topic.match_events.id

  ack_deadline_seconds = 30

  depends_on = [google_project_service.apis]
}

data "google_project" "project" {
  project_id = var.gcp_project_id
}
