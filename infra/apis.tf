# Enable every GCP API the MVP touches. Using for_each (rather than one
# resource per API) keeps this file a single source of truth as the list
# grows, and lets `terraform destroy` cleanly disable them all together.
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "cloudscheduler.googleapis.com",
    "pubsub.googleapis.com",
    "firestore.googleapis.com",
    "redis.googleapis.com",
    "aiplatform.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "cloudbuild.googleapis.com",
    "iam.googleapis.com",
    "translate.googleapis.com",
    # VPC Access is required for the Serverless VPC Connector (vpc.tf) that
    # lets Cloud Run reach Memorystore over its internal IP.
    "vpcaccess.googleapis.com",
  ])

  project = var.gcp_project_id
  service = each.value

  # Leave the APIs enabled on destroy so a `terraform destroy` doesn't also
  # disable APIs that might be relied on by resources outside this state
  # (or slow down a subsequent `terraform apply` re-enabling them).
  disable_on_destroy = false
}
