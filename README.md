# Stadium Copilot

A GenAI-enabled stadium operations and fan experience solution for FIFA World Cup 2026.
Built solo for [hackathon name] using React, Node.js, and Google Cloud.

## MVP Scope

1. **Live Match Companion** — real-time score/event ingestion ([worldcup26.ir](https://worldcup26.ir)) published to Pub/Sub and cached in Memorystore
2. **Queue-Aware Food Ordering** — QR-based ordering with a full order state machine and Gemini-powered incident-disruption handling (auto-reassignment or refund)

Both backend services and the frontend are built, deployed, and verified end-to-end against real infrastructure — see [Status](#status).

**Live**: [stadium-copilot.web.app](https://stadium-copilot.web.app) (Firebase Hosting) — try `/menu/test-stand-1` for the fan ordering flow or `/stand/test-stand-1/orders` for the staff queue view.

## Repo Structure

```
stadium-copilot/
  frontend/    React + TypeScript + Vite -> Firebase Hosting (live at stadium-copilot.web.app, see frontend/README.md)
  backend/     Node.js 22 + TypeScript services -> Docker on Cloud Run
    src/ingestion-service/   Polls worldcup26.ir, publishes match events, writes Redis cache
    src/order-service/       Menu browsing, order placement, disruption handling
  infra/       Terraform (one-command provision/teardown)
  .github/     CI workflows (lint, build, test)
```

## Architecture

```
Cloud Scheduler (1 min)              Pub/Sub push (OIDC)
       |                                     |
       v                                     v
ingestion-service  --publish-->  match-events / stand-status topics  --push-->  order-service
(Cloud Run,                              |                                    (Cloud Run,
 INTERNAL_ONLY,                          v                                     public,
 scale 0-3)                        Memorystore (Redis)                        scale 0-10)
       |                           60s TTL cache                                    |
       v                                                                            v
worldcup26.ir                                                              Firestore (orders, stands)
                                                                                     |
                                                                                     v
                                                                       Vertex AI Gemini Flash
                                                                    (menu summaries, reassignment msgs)
```

- **ingestion-service** (internal only, woken by Cloud Scheduler every 1 min, internally loops ~15-30s per invocation for effective sub-minute freshness): polls `GET /get/games`, filters to `time_elapsed === "live"`, publishes one `match-events` message per live match (with `match_id`/`status` as Pub/Sub attributes) and writes the same data to Redis (`match:{id}`, 60s TTL). Auth JWT is read from Secret Manager at runtime, cached in memory for the container's lifetime. Ships a `MOCK_MODE` fixture-cycling fallback for demoing if worldcup26.ir is down.
- **order-service** (public, no auth on menu browsing — all query params sanitized before reaching Gemini): `GET /menu/:stand_id`, `POST /orders`, `GET /orders/:order_id`, and `POST /events/stand-status` (the Pub/Sub push target for stand-closure incidents). On an incident, it queries affected orders, finds 1-2 alternate stands with overlapping dietary tags and a lower queue, and uses Gemini Flash to generate one short reassignment/refund message per order — always in the requested language (English/French/Portuguese supported, baked into the system prompt, not translated after the fact).

## Infrastructure (Terraform, `infra/`)

All resources below are live in `promptwars-502109` (`us-central1`) and verified via `gcloud`, not just `terraform state`:

| Resource | Real name | Notes |
|---|---|---|
| Cloud Run | `ingestion-service` | `INGRESS_TRAFFIC_INTERNAL_ONLY`, scale 0-3, VPC connector attached |
| Cloud Run | `order-service` | `INGRESS_TRAFFIC_ALL`, scale 0-10, `allUsers` has `run.invoker` |
| Cloud Scheduler | `poll-match-events` | `* * * * *`, OIDC → `ingestion-service /poll` |
| Pub/Sub topic | `match-events` | published by ingestion-service |
| Pub/Sub topic | `stand-status` (+ `stand-status-dlq`) | consumed by order-service |
| Pub/Sub sub | `match-events-match-companion-pull` | pull, for a future match-companion consumer |
| Pub/Sub sub | `stand-status-order-service-push` | **push**, OIDC, 5-attempt DLQ — wakes order-service from zero rather than requiring an always-on puller |
| Firestore | `(default)`, native mode | `orders/{id}`, `stands/{id}` |
| Memorystore | `stadium-copilot-cache` | Redis, Basic tier, 1GB, `DIRECT_PEERING` |
| VPC connector | `stadium-copilot-vpc` | e2-micro, min 2 / max 3 — lets Cloud Run reach Redis's internal IP |
| Secret Manager | `worldcup26-jwt-token` | value added out-of-band via `gcloud secrets versions add`, never in Terraform state |
| Secret Manager | `weather-api-key` | provisioned, not yet consumed by any service |
| Artifact Registry | `stadium-copilot-backend` | one Docker repo, both service images |
| IAM | `ingestion-service` SA | `pubsub.publisher`, `datastore.user`, secret accessor on the JWT secret |
| IAM | `order-service` SA | `datastore.user`, `pubsub.subscriber`, `aiplatform.user`, `run.invoker` (self, for the push sub) |

Two service accounts, not one shared identity — a bug in the public-facing `order-service` can't forge match events or read a secret it doesn't need.

```bash
cd infra
terraform init
terraform plan -var="gcp_project_id=promptwars-502109"
terraform apply -var="gcp_project_id=promptwars-502109"

# Teardown
terraform destroy -var="gcp_project_id=promptwars-502109"
```

## Backend (`backend/`)

```bash
cd backend
npm install
npm test              # 35 tests: unit + mocked-dependency + HTTP-layer integration, no network required
npm run build          # tsc -> dist/

npm run dev:ingestion   # tsx watch, local dev server
npm run dev:order       # tsx watch, local dev server
```

### Build and deploy a service image

One Dockerfile, both services — the entry point is picked at build time:

```bash
docker build --platform linux/amd64 --build-arg SERVICE=ingestion-service \
  -t us-central1-docker.pkg.dev/promptwars-502109/stadium-copilot-backend/ingestion-service:latest .
docker push us-central1-docker.pkg.dev/promptwars-502109/stadium-copilot-backend/ingestion-service:latest
gcloud run deploy ingestion-service --region=us-central1 --project=promptwars-502109 \
  --image=us-central1-docker.pkg.dev/promptwars-502109/stadium-copilot-backend/ingestion-service:latest

# same pattern with --build-arg SERVICE=order-service for the order service
```

### One-time setup the code depends on

- **worldcup26.ir JWT**: register/authenticate once yourself (`POST /auth/register` or `/auth/authenticate`), then push the token — it's never generated or stored by the app itself:
  ```bash
  echo -n "<jwt>" | gcloud secrets versions add worldcup26-jwt-token --project=promptwars-502109 --data-file=-
  ```
- **Firestore seed data**: `stands/{stand_id}` documents must exist before `/menu/:stand_id` or `/orders` will return anything. `backend/seed-test-stand.mjs` and `seed-second-stand.mjs` seed two test stands (`test-stand-1`, `test-stand-2`, same `match_id`) for manual end-to-end testing.

## Frontend (`frontend/`)

React + TypeScript + Vite. Screens, stack, and screenshots: [frontend/README.md](frontend/README.md).

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies to VITE_ORDER_SERVICE_URL (defaults to localhost:8080)
npm run build    # tsc -b && vite build -> dist/
npm test         # 46 tests: Vitest + React Testing Library, jsdom, no network required
```

### Deploy to Firebase Hosting

Live at **[stadium-copilot.web.app](https://stadium-copilot.web.app)**, deployed to the `stadium-copilot` Hosting site under `promptwars-502109` (config in `frontend/firebase.json` / `.firebaserc`):

```bash
cd frontend
npm run build
npx firebase-tools deploy --only hosting --project promptwars-502109
```

The deployed bundle points at `order-service`'s Cloud Run URL (`https://order-service-5caf7sq2va-uc.a.run.app`) via `VITE_ORDER_SERVICE_URL` baked in at build time (see `frontend/.env.example`). No CI/CD for this yet — it's a manual `.env.local`/`.env.production` + build + deploy, so re-run it after backend API changes:

```bash
echo "VITE_ORDER_SERVICE_URL=https://order-service-5caf7sq2va-uc.a.run.app" > frontend/.env.production
```

## Cost Notes

Not effectively $0 at this scale — two resources are always-on regardless of traffic:

- **Memorystore (Redis, Basic 1GB)**: ~$35/month, no scale-to-zero.
- **VPC connector** (min 2 instances): ~$12-18/month.
- **ingestion-service compute**: Cloud Scheduler fires every 1 minute, but each invocation internally loops for ~50s to get sub-minute freshness — so it's billed close to continuously (~$40-50/month), not truly scale-to-zero despite briefly hitting zero between polls.

Rough total if left running a full month: **~$90-110**. Cheapest lever for the judging window: pause the Cloud Scheduler job once live matches stop (`gcloud scheduler jobs pause poll-match-events`), or `terraform destroy` / `terraform apply` around actual demo windows rather than leaving everything up continuously.

## Status

Both MVP backend services and the frontend are **built, deployed, and verified end-to-end against real infrastructure** (not mocked):

- ingestion-service: real JWT auth against worldcup26.ir confirmed working, live match data (Norway vs England, QF) observed flowing through Pub/Sub with correct message attributes and no scorer-field leakage, Redis write/read round-trip directly verified.
- order-service: `GET /menu/:stand_id` returns real Firestore data with a genuine Gemini-generated summary (multi-language confirmed, French tested); `POST /orders` → `GET /orders/:id` round-trips through Firestore; a real `stand_closed_incident` Pub/Sub push was fired and confirmed to reassign an order to an alternate stand with a Gemini-generated message, all reflected correctly in Firestore.
- frontend: live on Firebase Hosting at [stadium-copilot.web.app](https://stadium-copilot.web.app), built against and calling the real `order-service` Cloud Run endpoint (not mocked/localhost). Menu browsing, cart, order placement, the order-status stepper, the staff order queue, and the match-detail view all confirmed working against real Firestore/Redis-backed data — see [frontend/README.md](frontend/README.md) for screenshots. Covered by 46 Vitest + React Testing Library tests (`cd frontend && npm test`) over the highest-risk logic: cart math, API error handling (including the documented `getMatch` 404→null behavior), the disruption-alert and order-status-stepper components, the polling hook's interval/cleanup behavior, and language switching.

**Not yet built**: a producer for the `stand-status` topic (order-service defines the consumer contract but nothing publishes real incidents yet), and any notification channel to actually surface reassignment messages to a fan.
