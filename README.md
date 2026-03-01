# AI Code Review Platform

Plateforme de revue de code automatisée orientée sécurité et qualité, basée sur FastAPI + Celery, avec pipeline asynchrone, scan de secrets, analyse statique (Ruff + Semgrep), catégorisation de changement (bugfix/feature/refactor), observabilité (Prometheus/Grafana) et intégrations optionnelles (OpenAI, Qdrant, MinIO).

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Documentation utilisateur](#2-documentation-utilisateur)
3. [Documentation technique](#3-documentation-technique)
4. [Schémas high-level](#4-schémas-high-level)
5. [Structure du projet](#5-structure-du-projet)
6. [Prérequis](#6-prérequis)
7. [Configuration `.env`](#7-configuration-env)
8. [Exécution en local avec Docker (recommandé)](#8-exécution-en-local-avec-docker-recommandé)
9. [Exécution locale hybride (API/Worker sur host)](#9-exécution-locale-hybride-apiworker-sur-host)
10. [Commandes complètes](#10-commandes-complètes)
11. [API HTTP (contrat d'usage)](#11-api-http-contrat-dusage)
12. [Migrations base de données](#12-migrations-base-de-données)
13. [Tests, qualité et CI/CD](#13-tests-qualité-et-cicd)
14. [Observabilité et supervision](#14-observabilité-et-supervision)
15. [Déploiement cloud](#15-déploiement-cloud)
16. [Troubleshooting (Windows/Linux)](#16-troubleshooting-windowslinux)
17. [Sécurité](#17-sécurité)
18. [État courant des modules](#18-état-courant-des-modules)

---

## 1. Vue d'ensemble

Le projet reçoit des diffs (via API ou webhook GitHub), les pousse en file Redis, puis un worker Celery exécute un pipeline de revue :

- parsing du diff unifié,
- scan de secrets et redaction,
- analyse statique Ruff/Semgrep,
- classification du changement (F4 : bugfix/feature/refactor),
- persistance des résultats et métriques.

Le backend API est fonctionnel et documenté. Les modules `apps/cli`, `apps/dashboard/src` et `libs/contracts/*` sont présents mais actuellement squelettiques (dossiers sans implémentation active).

---

## 2. Documentation utilisateur

### 2.1 Cas d'usage principal

1. Soumettre un diff avec `POST /v1/analyze`.
2. Récupérer `analysis_id`.
3. Poller `GET /v1/analyses/{analysis_id}` jusqu'à `COMPLETED`.
4. Consommer :
   - `findings` (global),
   - `security_findings`,
   - `static_findings`,
   - `change_type` + `change_type_confidence` (F4),
   - `static_stats`, `redaction_stats`, `tool_runs`.

### 2.2 Résultat attendu

Un objet d'analyse complet contient notamment :

- statut (`RECEIVED/QUEUED/RUNNING/COMPLETED/FAILED`),
- progression et stage,
- détails diff parsé (fichiers/hunks/lignes),
- findings sécurité + qualité,
- classification du changement (`bugfix|feature|refactor`),
- traces d'exécution outils.

---

## 3. Documentation technique

### 3.1 Stack

- Backend: FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, Celery, Redis, Psycopg3.
- Analyse: Ruff, Semgrep, moteur de parsing diff, scanner de secrets.
- Données: PostgreSQL.
- Observabilité: Prometheus, Grafana, Flower, exporters Redis/PostgreSQL.
- Optionnel: OpenAI (résumé), Qdrant (vector search), MinIO (S3 artifacts).

### 3.2 Pipeline d'analyse (worker)

Le task Celery `analysis.run_minimal_pipeline` :

1. met l'analyse en `RUNNING`,
2. parse le diff unifié,
3. exécute secret scan + redaction,
4. exécute F4 (classification changement),
5. exécute analyse statique (Ruff/Semgrep),
6. persiste findings + tool runs,
7. met l'analyse en `COMPLETED` ou `FAILED`.

### 3.3 F4 – catégorisation changement

La classification est en place dans le backend (`heuristic` actuellement), basée sur:

- métadonnées PR/commit/labels/branch,
- préfixes conventional commits (`fix:`, `feat:`, `refactor:`),
- ratio additions/deletions,
- types de fichiers (new/renamed/test/config),
- taille et structure du diff.

Sortie stockée dans `analyses` :

- `change_type` (`bugfix|feature|refactor`),
- `change_type_confidence` (`0..1`),
- `change_type_source` (`heuristic|llm`),
- `change_type_signals` (JSON des signaux).

Migration associée : `20260301_0009_f4_change_classification.py`.

---

## 4. Schémas high-level

### 4.1 Architecture globale (runtime local)

```text
Clients (Webhook GitHub / REST)
              │
              ▼
        FastAPI :8000
              │ enqueue
              ▼
         Redis (broker)
              │
              ▼
         Celery Worker
      ┌────────┼────────┐
      ▼        ▼        ▼
  PostgreSQL  Qdrant   MinIO
   (core DB) (opt.)   (opt.)

Observabilité:
Prometheus :9090 -> scrape FastAPI/Flower/exporters/MinIO
Grafana    :3000 -> dashboards
Flower     :5555 -> monitoring Celery
```

### 4.2 Diagramme pipeline (Mermaid)

```mermaid
flowchart LR
  A[POST /v1/analyze] --> B[(PostgreSQL: status RECEIVED)]
  B --> C[enqueue Redis]
  C --> D[Celery Worker]
  D --> E[Parse Unified Diff]
  E --> F[Secret Scan + Redaction]
  F --> G[F4 Change Classification]
  G --> H[Static Analysis Ruff + Semgrep]
  H --> I[(PostgreSQL: findings/tool_runs)]
  I --> J[Status COMPLETED]
```

### 4.3 Diagramme composants (Mermaid)

```mermaid
graph TD
  subgraph App
    API[FastAPI]
    W[Celery Worker]
  end
  subgraph Data
    PG[(PostgreSQL)]
    RD[(Redis)]
    QD[(Qdrant optionnel)]
    MN[(MinIO optionnel)]
  end
  subgraph Observability
    PR[Prometheus]
    GF[Grafana]
    FL[Flower]
  end
  API --> RD
  W --> RD
  W --> PG
  W --> QD
  W --> MN
  API --> PG
  API --> PR
  FL --> PR
  PR --> GF
```

Pour un schéma encore plus détaillé: `docs/architecture.md`.

---

## 5. Structure du projet

```text
ai-code-review-platform/
├─ apps/
│  ├─ backend/                 # Service principal (FastAPI + Celery + Alembic)
│  │  ├─ app/
│  │  │  ├─ api/http/          # Endpoints REST + webhook
│  │  │  ├─ core/              # Pipeline, sécurité, classification, static analysis
│  │  │  ├─ data/              # Modèles/repositories DB
│  │  │  └─ workers/           # Celery app + tasks
│  │  ├─ alembic/
│  │  │  └─ versions/          # Migrations SQL
│  │  └─ tests/unit/
│  ├─ dashboard/               # Placeholder (package minimal)
│  └─ cli/                     # Placeholder (src vide)
├─ infra/
│  ├─ local/docker-compose.yml # Stack locale complète
│  ├─ observability/           # Prometheus + dashboards Grafana
│  └─ cloud/                   # Guide cloud + configs Fly
├─ docs/
│  ├─ architecture.md
│  └─ manual-test-windows.md
├─ .github/workflows/          # CI/CD
├─ Makefile
└─ .env.example
```

---

## 6. Prérequis

### 6.1 Outils minimaux

| Outil | Version recommandée | Obligatoire |
|---|---:|---|
| Docker Desktop | récente | Oui (mode Docker) |
| Docker Compose plugin | récente | Oui |
| Git | récente | Oui |
| Python | 3.11+ | Oui (mode host/tests) |
| Poetry | 1.8+ | Oui (backend local) |
| Make | GNU Make | Optionnel mais conseillé |

### 6.2 Installation rapide Windows

- Make via Winget: `winget install GnuWin32.Make`
- ou utiliser Git Bash sans Make et exécuter les commandes `docker compose` / `poetry` directement.

---

## 7. Configuration `.env`

### 7.1 Création

```bash
# Git Bash / Linux / macOS
cp .env.example .env
```

```powershell
# PowerShell
Copy-Item .env.example .env
```

### 7.2 Variables critiques

| Variable | Valeur locale type | Rôle |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://postgres:simplepass@localhost:5432/ai_code_review_platform` | DB principale |
| `REDIS_URL` | `redis://localhost:6380/0` | broker/cache |
| `CELERY_BROKER_URL` | `redis://localhost:6380/0` | file tâches |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6380/1` | backend résultats |
| `GITHUB_WEBHOOK_SECRET` | `local-dev-secret` | validation HMAC webhook |
| `CELERY_WORKER_POOL` | `solo` (host Windows) | stabilité Celery Windows |

### 7.3 Variables optionnelles

- LLM : `LLM_ENABLED=true`, `OPENAI_API_KEY=...`
- Vector store : `QDRANT_ENABLED=true`, `QDRANT_URL=http://localhost:6333`
- Object storage : `OBJECT_STORAGE_ENABLED=true`, `MINIO_ENDPOINT=localhost:9000`
- RBAC : `RBAC_ENFORCEMENT_ENABLED=true`

### 7.4 Générer clé de chiffrement

```bash
make generate-fernet-key
```

ou

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 8. Exécution en local avec Docker (recommandé)

### 8.1 Démarrage standard

```bash
make build
make up
make migrate
```

### 8.2 Vérification

```bash
curl http://localhost:8000/healthz
```

Réponse attendue:

```json
{"status":"ok"}
```

### 8.3 Services et ports

| Port | Service | URL |
|---:|---|---|
| 8000 | FastAPI + docs | http://localhost:8000/docs |
| 8000 | Metrics API | http://localhost:8000/metrics |
| 5555 | Flower | http://localhost:5555 |
| 5432 | PostgreSQL | TCP |
| 6380 | Redis (host) | `redis://localhost:6380` |
| 6333 | Qdrant REST + dashboard | http://localhost:6333/dashboard |
| 6334 | Qdrant gRPC | TCP |
| 9000 | MinIO API | http://localhost:9000 |
| 9001 | MinIO Console | http://localhost:9001 |
| 9090 | Prometheus | http://localhost:9090 |
| 3000 | Grafana | http://localhost:3000 |
| 8080 | Adminer | http://localhost:8080 |
| 9121 | Redis exporter | http://localhost:9121/metrics |
| 9187 | Postgres exporter | http://localhost:9187/metrics |

---

## 9. Exécution locale hybride (API/Worker sur host)

Utile pour debug Python avec hot reload.

### 9.1 Lancer uniquement DB + Redis (Docker)

```bash
docker compose -f infra/local/docker-compose.yml up -d db redis
```

### 9.2 Backend sur host

```bash
cd apps/backend
poetry install --no-interaction
poetry run alembic -c alembic.ini upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```

### 9.3 Worker sur host

#### Windows

```bash
cd apps/backend
python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses -P solo
```

#### Linux/macOS

```bash
cd apps/backend
poetry run celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses
```

---

## 10. Commandes complètes

### 10.1 Makefile

```bash
make help
```

#### Stack

```bash
make build
make build-no-cache
make up
make down
make ps
make clean
```

#### Migrations

```bash
make migrate
make migrate-history
make migrate-create m=add_column_x
```

#### Logs / shells

```bash
make logs
make logs-api
make logs-worker
make api-shell
make worker-shell
make db-shell
```

#### Tests

```bash
make test
make test-ci
```

### 10.2 Sans Make

```bash
docker compose -f infra/local/docker-compose.yml build
docker compose -f infra/local/docker-compose.yml up -d
docker compose -f infra/local/docker-compose.yml ps
docker compose -f infra/local/docker-compose.yml logs -f api
docker compose -f infra/local/docker-compose.yml exec api alembic -c /app/alembic.ini upgrade head
```

---

## 11. API HTTP (contrat d'usage)

Préfixe principal: `/v1`

### 11.1 Endpoints

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/analyze` | Soumettre diff JSON |
| `POST` | `/v1/analyses` | Alias de `/v1/analyze` |
| `POST` | `/v1/analyze/stream` | Soumettre diff en stream |
| `POST` | `/v1/analyses/stream` | Alias stream |
| `GET` | `/v1/analyses/{analysis_id}` | Détails d'analyse |
| `GET` | `/v1/analyses` | Liste paginée |
| `POST` | `/v1/analyses/{analysis_id}/status` | Update statut |
| `POST` | `/v1/analyses/{analysis_id}/findings` | Ajout finding manuel |
| `POST` | `/webhooks/github` | Réception webhook GitHub |
| `GET` | `/healthz` | Health check |
| `GET` | `/metrics` | Metrics Prometheus |

### 11.2 Exemple JSON (création d'analyse)

```json
{
  "source": "manual",
  "repo": "owner/repo",
  "pr_number": 12,
  "commit_sha": "abc123",
  "diff_text": "diff --git a/a.py b/a.py\n...",
  "metadata": {
    "title": "fix: handle null pointer",
    "labels": ["bug"]
  }
}
```

### 11.3 Test manuel PowerShell

Guide complet: `docs/manual-test-windows.md`.

Exemple rapide:

```powershell
$diff = @"
diff --git a/demo.py b/demo.py
index 1111111..2222222 100644
--- a/demo.py
+++ b/demo.py
@@ -0,0 +1,3 @@
+import os
+def run(cmd: str):
+    return eval(cmd)
"@

$payload = @{
  source = "manual"
  repo = "owner/manual-test"
  pr_number = 1
  commit_sha = "abc123"
  diff_text = $diff
} | ConvertTo-Json -Depth 10

$r = Invoke-RestMethod -Uri "http://localhost:8000/v1/analyze" -Method Post -ContentType "application/json" -Body $payload
$id = $r.analysis_id
Invoke-RestMethod -Uri "http://localhost:8000/v1/analyses/$id" -Method Get
```

---

## 12. Migrations base de données

### 12.1 État actuel

Migrations présentes (ordre):

- `20260227_0001_create_analyses.py`
- `20260227_0002_t2_schema_and_lifecycle.py`
- `20260227_0003_analysis_progress_and_stage.py`
- `20260227_0004_t4_unified_diff_schema.py`
- `20260227_0005_t5_secret_scan_and_redaction.py`
- `20260227_0006_t6_static_analysis_schema.py`
- `20260228_0007_t6_tool_runs_tracking.py`
- `20260228_0008_rbac_and_encrypted_secrets.py`
- `20260301_0009_f4_change_classification.py`
- `20260301_0010_f3_analysis_summary.py`

### 12.2 Commandes utiles

```bash
# Docker
make migrate
make migrate-history

# Host
cd apps/backend
poetry run alembic -c alembic.ini current
poetry run alembic -c alembic.ini history
poetry run alembic -c alembic.ini upgrade head
```

---

## 13. Tests, qualité et CI/CD

### 13.1 Local

```bash
cd apps/backend
poetry run pytest tests/ -v --tb=short
poetry run pytest tests/unit/test_change_classifier.py -v
poetry run ruff check .
poetry run ruff format --check .
```

### 13.2 CI (GitHub Actions)

Workflow `ci.yml`:

1. lint Ruff,
2. tests pytest avec services PostgreSQL+Redis,
3. smoke build Docker backend.

### 13.3 CD (GitHub Actions)

Workflow `cd.yml`:

1. build image backend,
2. push GHCR,
3. déploiement Fly.io API,
4. déploiement Fly.io Worker.

---

## 14. Observabilité et supervision

### 14.1 Prometheus

- Config: `infra/observability/prometheus.yml`
- Cibles: API `/metrics`, Flower, exporters, MinIO.

### 14.2 Grafana

Dashboards provisionnés:

- `infra/observability/grafana/dashboards/fastapi.json`
- `infra/observability/grafana/dashboards/celery.json`
- `infra/observability/grafana/dashboards/redis.json`
- `infra/observability/grafana/dashboards/postgresql.json`

Credentials locales par défaut : `admin / admin`.

---

## 15. Déploiement cloud

Guide complet: `infra/cloud/README.md`.

Stack cible documentée:

- Compute: Fly.io,
- PostgreSQL: Supabase,
- Redis: Upstash,
- Registry: GHCR.

Commandes de base:

```bash
flyctl deploy --config infra/cloud/fly/fly-api.toml
flyctl deploy --config infra/cloud/fly/fly-worker.toml
```

---

## 16. Troubleshooting (Windows/Linux)

### 16.1 `alembic upgrade head` échoue

Causes fréquentes:

- commande lancée hors `apps/backend`,
- `.env` absent/invalide,
- PostgreSQL non démarré,
- URL SQLAlchemy incorrecte.

Correctif:

```bash
cd apps/backend
poetry run alembic -c alembic.ini upgrade head
```

ou (Docker)

```bash
docker compose -f infra/local/docker-compose.yml exec api alembic -c /app/alembic.ini upgrade head
```

### 16.2 Chemins Windows avec espaces

```powershell
cd "C:\Users\Ahmed Amin Bejoui\Desktop\ai-code-review-platform\apps\backend"
```

### 16.3 `celery: command not found`

```bash
python -m celery -A app.workers.celery_app.celery_app worker --loglevel=info -Q analyses -P solo
```

### 16.4 Analyse bloquée à `QUEUED`

Vérifier:

- worker actif,
- broker Redis reachable,
- queue `analyses` identique côté API + worker,
- `CELERY_TASK_ALWAYS_EAGER` non activé par erreur en prod.

---

## 17. Sécurité

- Ne jamais committer `.env` réel.
- `diff_redacted` est utilisé pour éviter l'exposition de secrets.
- Activer RBAC en production (`RBAC_ENFORCEMENT_ENABLED=true`).
- Garder `ALLOW_UNSAFE_DIFF_API=false` en production.
- Chiffrer les secrets avec `SECRETS_ENCRYPTION_KEY`.
- Faire rotation des clés/tokens si exposition.

---

## 18. État courant des modules

| Module | État |
|---|---|
| `apps/backend` | Actif, fonctionnel, cœur du produit |
| `apps/dashboard` | Initialisé (`package.json`) mais sans source front active |
| `apps/cli` | Dossier présent, source vide |
| `libs/contracts/pydantic` | Dossier présent, vide |
| `libs/contracts/typescript` | Dossier présent, vide |
| `scripts` | Dossier présent, vide |

---

## Références internes

- Architecture détaillée: `docs/architecture.md`
- Test manuel Windows: `docs/manual-test-windows.md`
- Guide cloud: `infra/cloud/README.md`
- Stack locale Docker: `infra/local/docker-compose.yml`
- Variables d'environnement: `.env.example`
- Commandes dev: `Makefile`

---

## Licence

Ce projet est distribué sous licence MIT. Voir `LICENSE`.
