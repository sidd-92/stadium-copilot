# Firebase resources require the google-beta provider.
#
# Terraform here only provisions the Firebase project link and hosting
# site "shell" — day-to-day frontend content deploys go through
# `firebase deploy --only hosting`, not repeated `terraform apply`. Re-
# running Terraform on every frontend change would be slow and doesn't fit
# how Firebase Hosting release/versioning actually works.

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.gcp_project_id

  depends_on = [google_project_service.apis]
}

resource "google_firebase_hosting_site" "frontend" {
  provider = google-beta
  project  = var.gcp_project_id
  site_id  = "stadium-copilot"

  depends_on = [google_firebase_project.default]
}
