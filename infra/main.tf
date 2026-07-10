terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "google-beta" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# Resources (Cloud Run, Pub/Sub, Firestore, Memorystore, Secret Manager,
# Firebase Hosting, IAM) will be added as separate .tf files:
#   ingestion.tf, messaging.tf, data.tf, ai.tf, secrets.tf, iam.tf, firebase.tf
