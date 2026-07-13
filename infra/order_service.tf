# Order service: public-facing QR-based food ordering. Fans hit this
# directly to browse menus and place orders; it also receives push
# deliveries on stand-status incidents (messaging.tf) to disrupt/reroute
# affected orders.
resource "google_cloud_run_v2_service" "order_service" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = "order-service"

  # ALL: fans scan a QR code and hit this service straight from their
  # phones, so it must be reachable from the public internet.
  ingress = "INGRESS_TRAFFIC_ALL"

  # This is a hackathon MVP that must tear down cleanly with a single
  # `terraform destroy` — no manual deletion-protection overrides required.
  deletion_protection = false

  template {
    service_account = google_service_account.order_service.email

    scaling {
      min_instance_count = 0
      # Higher ceiling than ingestion-service (0-3): this is the fan-facing
      # path and needs headroom for concession-stand order spikes (e.g.
      # halftime) and any stand-status-triggered demand shift.
      max_instance_count = 10
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.order_service_image

      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = tostring(google_redis_instance.cache.port)
      }
      env {
        name  = "STAND_STATUS_TOPIC"
        value = google_pubsub_topic.stand_status.name
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

# Public menu browsing / order placement: allUsers may invoke. The
# ordering flow itself has no auth (fans aren't logged-in accounts for this
# MVP); anything sensitive (payment, etc.) is handled inside the app layer,
# not via Cloud Run ingress control.
resource "google_cloud_run_v2_service_iam_member" "order_service_public_invoker" {
  project  = var.gcp_project_id
  location = var.gcp_region
  name     = google_cloud_run_v2_service.order_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
