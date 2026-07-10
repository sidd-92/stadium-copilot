# Stadium Copilot

A GenAI-enabled stadium operations and fan experience solution for FIFA World Cup 2026.
Built solo for [hackathon name] using Antigravity, React, Node.js, and Google Cloud.

## MVP Scope

1. **Live Match Companion** — real-time score/event ingestion (worldcupapi.com) with push notifications
2. **Queue-Aware Food Ordering** — QR-based ordering with queue-aware stand suggestions and incident-disruption handling

Text-based multilingual support (native-language Gemini generation, e.g. French/Portuguese) is included
as an accessible substitute for a full voice assistant.

## Repo Structure

```
stadium-copilot/
  frontend/    React + TypeScript + Vite -> Firebase Hosting
  backend/     Node.js 22 + TypeScript services -> Docker on Cloud Run
  infra/       Terraform (one-command provision/teardown)
  .github/     CI workflows (lint, build, test)
```

## Architecture (short version)

```
Cloud Scheduler -> Cloud Run (ingestion) -> Pub/Sub -> Memorystore (cache)
                                                |
                                          Firestore (structured data)
                                                |
                              Vertex AI (Gemini Flash/Pro) + Vertex AI Search
```

One shared backbone (ingestion -> Pub/Sub -> Memorystore cache, Firestore for
structured metadata, Gemini Flash for fan-facing synthesis) is reused across
both MVP features rather than building parallel pipelines per feature.

## Local Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Infra (provision)
cd infra && terraform init && terraform plan && terraform apply

# Infra (teardown)
cd infra && terraform destroy
```

## Cost Notes

Hackathon-scale usage runs at effectively $0 across Cloud Run, Firestore,
Pub/Sub, Cloud Scheduler, Secret Manager, and Firebase Hosting free tiers.
The one non-free component is Memorystore (Redis) — provision it via
Terraform only while actively developing/demoing, and `terraform destroy`
between sessions to avoid standing cost.

## Status

No code has shipped yet — this repo currently holds the project scaffold,
CI configuration, and infrastructure-as-code setup. See open issues / project
board for build progress.
