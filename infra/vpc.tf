# Serverless VPC Access connector: Cloud Run has no VPC presence by
# default, but Memorystore Redis only exposes an internal (VPC) IP via
# DIRECT_PEERING. This connector bridges the two.
resource "google_vpc_access_connector" "connector" {
  provider = google-beta

  project = var.gcp_project_id
  region  = var.gcp_region
  name    = "stadium-copilot-vpc"

  network = "default"

  # Smallest footprint available: e2-micro machines, 2-3 instances. This is
  # a demo-scale MVP with low, bursty traffic — no need to pay for the
  # connector's default larger sizing.
  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3
  ip_cidr_range = "10.8.0.0/28"

  depends_on = [google_project_service.apis]
}
