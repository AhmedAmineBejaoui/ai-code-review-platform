# Architecture des Flux - AI Code Review Platform

## Vue d'Ensemble Globale

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ENTRY POINTS                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  GitHub Webhook    │    Dashboard UI    │    API Direct    │    CLI (future)            │
│  (push, PR, branch)│    (manual upload) │    (automation)  │                            │
└─────────┬──────────┴─────────┬──────────┴────────┬─────────┴────────────────────────────┘
          │                    │                   │
          ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION & AUTHORIZATION                              │
│                                                                                          │
│   Clerk Auth ──► Role Extraction ──► Permission Check ──► Organization Context          │
│                                                                                          │
│   Roles: admin | tech_lead | reviewer_lead | reviewer_senior | reviewer_junior | dev    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CORE ENTITIES                                          │
│                                                                                          │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐     │
│  │Organization│───►│  Project  │───►│  Branch   │───►│ Analysis  │───►│  Review   │     │
│  └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘     │
│        │                │                │                │                │             │
│        ▼                ▼                ▼                ▼                ▼             │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐     │
│  │  Members  │    │  Settings │    │ Protection│    │ Findings  │    │ Comments  │     │
│  └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. FLUX ORGANISATION & MEMBRES

### 1.1 Création d'Organisation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ADMIN/TECH_LEAD                                                              │
│                                                                              │
│  Dashboard                        Backend                     Database       │
│  ────────                         ───────                     ────────       │
│                                                                              │
│  [Créer Org] ──────────────────► POST /api/v1/teams                         │
│      │                                │                                      │
│      │                                ▼                                      │
│      │                         TeamsService.create_organization()            │
│      │                                │                                      │
│      │                                ├──► INSERT organizations              │
│      │                                │                                      │
│      │                                ├──► INSERT organization_memberships   │
│      │                                │    (creator = owner)                 │
│      │                                │                                      │
│      │                                ├──► NotificationService               │
│      │                                │    (org.created)                     │
│      │                                │                                      │
│      ◄────────────────────────────────┘                                      │
│  [Org Dashboard]                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Gestion des Membres

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MEMBER MANAGEMENT FLOW                             │
│                                                                              │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            │
│  │    OWNER    │────────►│    ADMIN    │────────►│   MEMBER    │            │
│  │             │         │             │         │             │            │
│  │ - Full ctrl │         │ - Manage    │         │ - View      │            │
│  │ - Billing   │         │   members   │         │ - Contribute│            │
│  │ - Delete    │         │ - Settings  │         │   to proj   │            │
│  └─────────────┘         └─────────────┘         └─────────────┘            │
│                                                                              │
│  Actions disponibles:                                                        │
│  ───────────────────                                                         │
│  POST   /teams/{id}/members     → Inviter membre                            │
│  PUT    /teams/{id}/members/{u} → Changer rôle                              │
│  DELETE /teams/{id}/members/{u} → Retirer membre                            │
│                                                                              │
│  Notifications déclenchées:                                                  │
│  ─────────────────────────                                                   │
│  • member.invited    → Email + In-app au nouveau membre                     │
│  • member.removed    → Email au membre retiré                               │
│  • role.changed      → In-app au membre concerné                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Connexion UI Actuelle

| Page UI | API Connectée | Status |
|---------|---------------|--------|
| `/dashboard/teams` | `GET /api/v1/teams` | ⚠️ Partiel |
| `/dashboard/admin/users` | `GET /api/dashboard/admin/users` | ✅ Connecté |
| `/dashboard/admin/organization` | `GET /api/v1/teams/{id}` | ⚠️ Partiel |

---

## 2. FLUX PROJETS & REPOSITORIES

### 2.1 Enregistrement Repository

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REPOSITORY REGISTRATION FLOW                         │
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │  TRIGGER SOURCES │                                                        │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           ├──► [1] GitHub Webhook (premier push)                            │
│           │         │                                                        │
│           │         ▼                                                        │
│           │    POST /webhooks/github                                         │
│           │         │                                                        │
│           │         ▼                                                        │
│           │    BranchSyncService.handle_push_event()                        │
│           │         │                                                        │
│           │         ├──► Upsert repo_profiles                               │
│           │         └──► Create/Update branches                             │
│           │                                                                  │
│           ├──► [2] Dashboard Manual                                         │
│           │         │                                                        │
│           │         ▼                                                        │
│           │    POST /api/v1/repositories                                     │
│           │         │                                                        │
│           │         ▼                                                        │
│           │    RepositoryService.register()                                  │
│           │         │                                                        │
│           │         ├──► Validate GitHub access                             │
│           │         ├──► Fetch repo metadata                                │
│           │         └──► Insert repo_profiles                               │
│           │                                                                  │
│           └──► [3] GitHub App Installation                                  │
│                     │                                                        │
│                     ▼                                                        │
│                POST /webhooks/github (installation event)                    │
│                     │                                                        │
│                     ▼                                                        │
│                Auto-register all repos in installation                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Configuration Projet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROJECT SETTINGS FLOW                                │
│                                                                              │
│  Qui peut configurer: ADMIN, TECH_LEAD uniquement                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Auto-Analysis Settings                           │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  État effectif:                                                      │    │
│  │  ┌──────────┐    ┌──────────┐    ┌─────────────────────┐            │    │
│  │  │ ENABLED  │───►│ DISABLED │───►│ TEMPORARILY_DISABLED│            │    │
│  │  │          │    │          │    │                     │            │    │
│  │  │ Analyses │    │ Bloqué   │    │ Pause temporaire    │            │    │
│  │  │ auto     │    │ (raison) │    │ (1-1440 min)        │            │    │
│  │  └──────────┘    └──────────┘    └─────────────────────┘            │    │
│  │       ▲                               │                              │    │
│  │       └───────────────────────────────┘                              │    │
│  │              (expiration auto)                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  APIs:                                                                       │
│  GET  /projects/{id}/settings/auto-analysis          → Voir état           │
│  PUT  /projects/{id}/settings/auto-analysis          → Activer/Désactiver  │
│  POST /projects/{id}/settings/auto-analysis/temp     → Pause temporaire    │
│  GET  /projects/{id}/settings/auto-analysis/audit    → Historique          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Connexion Projet ↔ Branches

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROJECT - BRANCH RELATIONSHIP                           │
│                                                                              │
│  ┌─────────────┐                                                             │
│  │   PROJECT   │                                                             │
│  │  (repo_id)  │                                                             │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         │ 1:N                                                                │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          BRANCHES                                    │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  Type         │ Pattern            │ Protected │ Auto-Analysis      │    │
│  │  ─────────────┼────────────────────┼───────────┼──────────────────  │    │
│  │  main         │ main, master       │ ✅        │ ❌ (PR only)       │    │
│  │  develop      │ develop, dev       │ ✅        │ ⚙️ Configurable    │    │
│  │  feature      │ feature/*, feat/*  │ ❌        │ ✅ Auto            │    │
│  │  hotfix       │ hotfix/*, fix/*    │ ❌        │ ✅ Prioritaire     │    │
│  │  release      │ release/*, rel/*   │ ✅        │ ✅ Auto            │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                                                                    │
│         │ 1:N                                                                │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │  ANALYSES   │                                                             │
│  │(branch_id)  │                                                             │
│  └─────────────┘                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. FLUX ANALYSE (CORE)

### 3.1 Déclenchement Analyse

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANALYSIS TRIGGER FLOW                                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      TRIGGER SOURCES                                │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  [A] GITHUB WEBHOOK                                                          │
│      ─────────────────                                                       │
│      POST /webhooks/github                                                   │
│           │                                                                  │
│           ├─► push event                                                     │
│           │   └─► Si feature branch + auto-analysis enabled                 │
│           │       └─► Queue analyze_pr_task                                  │
│           │                                                                  │
│           ├─► pull_request event (opened/synchronize/reopened)              │
│           │   └─► Queue analyze_pr_task avec PR diff                        │
│           │                                                                  │
│           ├─► create event (branch)                                          │
│           │   └─► Créer/réactiver BranchORM                                 │
│           │                                                                  │
│           └─► delete event (branch)                                          │
│               └─► Mark branch inactive (merge_status=deleted)               │
│                                                                              │
│  [B] DASHBOARD MANUAL                                                        │
│      ─────────────────                                                       │
│      POST /api/dashboard/analyses                                            │
│           │                                                                  │
│           ├─► Upload diff file                                               │
│           ├─► Select GitHub repo + branch                                   │
│           └─► Import folder (synthetic diff)                                │
│           │                                                                  │
│           └─► Queue analyze_pr_task                                          │
│                                                                              │
│  [C] API DIRECT                                                              │
│      ──────────────                                                          │
│      POST /api/v1/analyze                                                    │
│           │                                                                  │
│           └─► Payload: repo, base_sha, head_sha, diff                       │
│               └─► Queue analyze_pr_task                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Pipeline d'Analyse (Celery Worker)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANALYSIS PIPELINE                                    │
│                                                                              │
│  analyze_pr_task (Celery)                                                    │
│  ════════════════════════                                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STAGE 1: PARSE DIFF                                                  │    │
│  │ ───────────────────                                                  │    │
│  │ • Parser unified diff format                                         │    │
│  │ • Extraire: files changed, additions, deletions                      │    │
│  │ • Créer DiffChunk objects                                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STAGE 2: SECRET SCANNING                                             │    │
│  │ ────────────────────────                                             │    │
│  │ • Détecter patterns sensibles:                                       │    │
│  │   - API keys (AWS, GCP, Azure, Stripe, etc.)                        │    │
│  │   - Tokens (JWT, OAuth, GitHub, etc.)                               │    │
│  │   - Passwords, certificates, private keys                           │    │
│  │ • Redact secrets dans le diff stocké                                │    │
│  │ • Créer findings type=secret                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STAGE 3: STATIC ANALYSIS (parallel)                                  │    │
│  │ ───────────────────────────────────                                  │    │
│  │                                                                      │    │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────────┐                     │    │
│  │  │   Ruff   │   │ Semgrep  │   │  CleanCode   │                     │    │
│  │  │          │   │          │   │              │                     │    │
│  │  │ Python   │   │ Security │   │ Complexity   │                     │    │
│  │  │ linting  │   │ rules    │   │ metrics      │                     │    │
│  │  └────┬─────┘   └────┬─────┘   └──────┬───────┘                     │    │
│  │       │              │                │                              │    │
│  │       └──────────────┼────────────────┘                              │    │
│  │                      ▼                                               │    │
│  │              Merge findings                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STAGE 4: CHANGE CLASSIFICATION                                       │    │
│  │ ─────────────────────────────                                        │    │
│  │ Classifier le changement:                                            │    │
│  │                                                                      │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌────────┐ │    │
│  │  │ bugfix   │ │ feature  │ │ refactor │ │ maintenance │ │  docs  │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────────┘ └────────┘ │    │
│  │                                                                      │    │
│  │ Basé sur: patterns fichiers, messages commit, contenu diff          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STAGE 5: KB CONTEXT RETRIEVAL (RAG)                                  │    │
│  │ ───────────────────────────────────                                  │    │
│  │ • Recherche sémantique dans Knowledge Base                          │    │
│  │ • Récupérer: patterns similaires, findings passés                   │    │
│  │ • Context packing pour prompt LLM                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STAGE 6: LLM GROUNDED ANALYSIS                                       │    │
│  │ ─────────────────────────────                                        │    │
│  │ • Générer findings avec:                                             │    │
│  │   - category: bug | security | performance | style | maintainability│    │
│  │   - severity: critical | high | medium | low | info                 │    │
│  │   - file_path, line_number, code_snippet                            │    │
│  │   - suggestion, explanation                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STAGE 7: SUMMARY GENERATION                                          │    │
│  │ ──────────────────────────                                           │    │
│  │ • Executive summary                                                  │    │
│  │ • Risk assessment                                                    │    │
│  │ • Recommended actions prioritized                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STAGE 8: PERSISTENCE & TRIGGERS                                      │    │
│  │ ─────────────────────────────                                        │    │
│  │ • UPDATE analyses SET status='COMPLETED', findings=...               │    │
│  │ • UPDATE branches SET last_analysis_id=...                          │    │
│  │ • NotificationService.notify('analysis.completed')                   │    │
│  │ • IF auto_review_enabled:                                            │    │
│  │     ReviewAutoAssignmentService.assign()                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Cycle de Vie Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANALYSIS LIFECYCLE                                   │
│                                                                              │
│     ┌──────────┐                                                             │
│     │ RECEIVED │ ◄─── Requête reçue, validée                                │
│     └────┬─────┘                                                             │
│          │                                                                   │
│          ▼                                                                   │
│     ┌──────────┐                                                             │
│     │  QUEUED  │ ◄─── Task Celery créée                                     │
│     └────┬─────┘                                                             │
│          │                                                                   │
│          ▼                                                                   │
│     ┌──────────┐                                                             │
│     │ RUNNING  │ ◄─── Worker traite l'analyse                               │
│     └────┬─────┘                                                             │
│          │                                                                   │
│          ├─────────────────────┐                                             │
│          │                     │                                             │
│          ▼                     ▼                                             │
│     ┌──────────┐         ┌──────────┐                                       │
│     │COMPLETED │         │  FAILED  │                                       │
│     └──────────┘         └──────────┘                                       │
│          │                     │                                             │
│          │                     │                                             │
│          ▼                     ▼                                             │
│     ┌──────────┐         ┌──────────┐                                       │
│     │ → Review │         │ → Retry  │ (max 3 attempts)                      │
│     │   Queue  │         │ → Alert  │                                       │
│     └──────────┘         └──────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. FLUX REVIEW

### 4.1 Auto-Assignment Algorithm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REVIEW AUTO-ASSIGNMENT FLOW                             │
│                                                                              │
│  Trigger: Analysis COMPLETED                                                 │
│  Service: ReviewAutoAssignmentService                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 1: GET ELIGIBLE REVIEWERS                                       │    │
│  │ ─────────────────────────────                                        │    │
│  │ Filtres:                                                             │    │
│  │ • Membre de l'organisation ✓                                         │    │
│  │ • Statut actif ✓                                                     │    │
│  │ • N'est pas l'auteur du PR ✓                                        │    │
│  │ • Rôle reviewer (junior/senior/lead) ✓                              │    │
│  │ • Disponibilité (pas en vacances) ✓                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 2: CALCULATE SCORES (pour chaque reviewer)                      │    │
│  │ ──────────────────────────────────────────────                       │    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────────────────────┐     │    │
│  │  │ SPECIALTY MATCH (40%)                                       │     │    │
│  │  │ • Language proficiency (Python, TypeScript, etc.)          │     │    │
│  │  │ • Framework expertise (React, FastAPI, etc.)               │     │    │
│  │  │ • File type experience (frontend/backend/infra)            │     │    │
│  │  └────────────────────────────────────────────────────────────┘     │    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────────────────────┐     │    │
│  │  │ WORKLOAD BALANCE (30%)                                      │     │    │
│  │  │ • Current open assignments count                           │     │    │
│  │  │ • Target: even distribution across team                    │     │    │
│  │  │ • Penalty for overloaded reviewers                         │     │    │
│  │  └────────────────────────────────────────────────────────────┘     │    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────────────────────┐     │    │
│  │  │ HISTORY SCORE (20%)                                         │     │    │
│  │  │ • Past reviews on same repository                          │     │    │
│  │  │ • Review quality metrics                                   │     │    │
│  │  │ • Knowledge of codebase                                    │     │    │
│  │  └────────────────────────────────────────────────────────────┘     │    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────────────────────┐     │    │
│  │  │ RANDOM FACTOR (10%)                                         │     │    │
│  │  │ • Prevent starvation                                       │     │    │
│  │  │ • Fair distribution over time                              │     │    │
│  │  └────────────────────────────────────────────────────────────┘     │    │
│  │                                                                      │    │
│  │  FINAL_SCORE = 0.4×Specialty + 0.3×Workload + 0.2×History + 0.1×Rand│    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 3: APPLY CONSTRAINTS                                            │    │
│  │ ────────────────────────                                             │    │
│  │ • Max concurrent reviews per reviewer                                │    │
│  │ • Minimum required reviewers (from project settings)                │    │
│  │ • Level requirements for critical changes:                          │    │
│  │   - Security findings → Senior/Lead required                        │    │
│  │   - Critical severity → Lead required                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4: CREATE ASSIGNMENTS                                           │    │
│  │ ────────────────────────                                             │    │
│  │ • INSERT review_assignments (top N scorers)                         │    │
│  │ • Set priority based on finding severity                            │    │
│  │ • Calculate due_date based on SLA                                   │    │
│  │ • NotificationService.notify('assignment.new')                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Review Lifecycle par Rôle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REVIEW LIFECYCLE BY ROLE                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     REVIEWER_JUNIOR                                  │    │
│  │                     ───────────────                                  │    │
│  │  Permissions:                                                        │    │
│  │  ✅ Approve (avec limites)                                           │    │
│  │  ✅ Comment                                                          │    │
│  │  ✅ Suggest changes                                                  │    │
│  │  ✅ Escalate to senior                                               │    │
│  │  ❌ Block merge                                                      │    │
│  │  ❌ Assign others                                                    │    │
│  │                                                                      │    │
│  │  Workflow:                                                           │    │
│  │  ┌──────────┐    ┌───────────┐    ┌──────────────────┐              │    │
│  │  │ Assigned │───►│ In Review │───►│ Approve/Escalate │              │    │
│  │  └──────────┘    └───────────┘    └──────────────────┘              │    │
│  │                        │                    │                        │    │
│  │                        │                    ▼                        │    │
│  │                        │          ┌──────────────────┐              │    │
│  │                        └─────────►│ Request Senior   │              │    │
│  │                                   │ (if complex)     │              │    │
│  │                                   └──────────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     REVIEWER_SENIOR                                  │    │
│  │                     ───────────────                                  │    │
│  │  Permissions:                                                        │    │
│  │  ✅ Approve                                                          │    │
│  │  ✅ Block merge                                                      │    │
│  │  ✅ Request mandatory changes                                        │    │
│  │  ✅ Resolve escalations                                              │    │
│  │  ❌ Assign others                                                    │    │
│  │  ❌ Team analytics                                                   │    │
│  │                                                                      │    │
│  │  Workflow:                                                           │    │
│  │  ┌──────────┐    ┌───────────┐    ┌─────────────────────────────┐   │    │
│  │  │ Assigned │───►│ In Review │───►│ Approve/Block/Request Changes│   │    │
│  │  └──────────┘    └───────────┘    └─────────────────────────────┘   │    │
│  │                        │                                             │    │
│  │                        ▼                                             │    │
│  │               ┌────────────────┐                                     │    │
│  │               │ Handle Junior  │                                     │    │
│  │               │ Escalations    │                                     │    │
│  │               └────────────────┘                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     REVIEWER_LEAD                                    │    │
│  │                     ────────────                                     │    │
│  │  Permissions:                                                        │    │
│  │  ✅ All senior permissions                                           │    │
│  │  ✅ Assign/reassign reviews                                          │    │
│  │  ✅ Delegate to team members                                         │    │
│  │  ✅ Team analytics access                                            │    │
│  │  ✅ Create review templates                                          │    │
│  │  ✅ Override decisions                                               │    │
│  │                                                                      │    │
│  │  Workflow:                                                           │    │
│  │  ┌──────────┐    ┌────────────────────────────────────────────┐     │    │
│  │  │ Overview │───►│ Manage Team + Direct Review + Assignments │     │    │
│  │  └──────────┘    └────────────────────────────────────────────┘     │    │
│  │        │                                                             │    │
│  │        ├──► View team workload                                       │    │
│  │        ├──► Reassign overdue reviews                                │    │
│  │        ├──► Handle blocked PRs                                       │    │
│  │        └──► Team performance analytics                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Review Queue Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REVIEW QUEUE FLOW                                    │
│                                                                              │
│  Page: /dashboard/reviewer/queue                                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         QUEUE TABS                                   │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │  MY QUEUE    │  │  AVAILABLE   │  │  UNASSIGNED  │ (Lead only)  │    │
│  │  │              │  │              │  │              │              │    │
│  │  │ Assigned to  │  │ Self-assign  │  │ Need assign- │              │    │
│  │  │ me           │  │ pool         │  │ ment         │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      QUEUE ITEM ACTIONS                              │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  Pour chaque item:                                                   │    │
│  │                                                                      │    │
│  │  [Start Review] ──► PUT /reviews/assignments/{id}/start             │    │
│  │       │              └── status: pending → in_progress              │    │
│  │       │              └── started_at = now()                         │    │
│  │       │              └── Redirect to /dashboard/review/{id}         │    │
│  │       │                                                              │    │
│  │  [Decline] ──────► PUT /reviews/assignments/{id}/decline            │    │
│  │       │              └── Reason required                            │    │
│  │       │              └── Trigger re-assignment                      │    │
│  │       │                                                              │    │
│  │  [Self-Assign] ──► POST /reviews/assignments (self)                 │    │
│  │       │              └── From "Available" pool                      │    │
│  │       │                                                              │    │
│  │  [Assign To] ────► POST /reviews/assignments (lead only)            │    │
│  │                      └── Select team member                         │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      SORTING & FILTERING                             │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  Sort by:   [Priority ▼] [Due Date] [Created] [Size]               │    │
│  │                                                                      │    │
│  │  Filter by: [All ▼] [Critical] [High] [Overdue] [Security]         │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 My Reviews Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MY REVIEWS FLOW                                      │
│                                                                              │
│  Page: /dashboard/reviewer/my-reviews                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         TABS                                         │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │    │
│  │  │ IN PROGRESS │  │  PENDING    │  │  COMPLETED  │  │  DECLINED  │ │    │
│  │  │             │  │             │  │             │  │            │ │    │
│  │  │ Active work │  │ Not started │  │ History     │  │ Rejected   │ │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      IN PROGRESS ITEM                                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────────────────────────┐ │    │
│  │  │ PR #456 - feature/auth-module                                  │ │    │
│  │  │ repo: frontend/webapp                                          │ │    │
│  │  │ author: alice@company.com                                      │ │    │
│  │  │                                                                │ │    │
│  │  │ Started: 2h ago          Due: 6h remaining                    │ │    │
│  │  │ Progress: ████████░░░░░░ 60% (3/5 files reviewed)             │ │    │
│  │  │                                                                │ │    │
│  │  │ [Continue Review]  [Pause]  [Complete]                        │ │    │
│  │  └────────────────────────────────────────────────────────────────┘ │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Actions:                                                                    │
│  ────────                                                                    │
│  [Continue Review] ──► Open /dashboard/review/{id}                          │
│  [Complete] ─────────► PUT /reviews/assignments/{id}/complete               │
│  [Request Help] ─────► Escalate to senior/lead                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. FLUX STATISTIQUES & RAPPORTS

### 5.1 Statistics Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATISTICS FLOW                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    DATA SOURCES                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│       ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │
│       │   Analyses   │   │   Reviews    │   │   Findings   │              │
│       │              │   │              │   │              │              │
│       │ - count      │   │ - completed  │   │ - by severity│              │
│       │ - status     │   │ - time       │   │ - by category│              │
│       │ - duration   │   │ - decisions  │   │ - trends     │              │
│       └──────┬───────┘   └──────┬───────┘   └──────┬───────┘              │
│              │                  │                  │                       │
│              └──────────────────┼──────────────────┘                       │
│                                 │                                          │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AGGREGATION ENGINE                                │   │
│  │                    ──────────────────                                │   │
│  │                                                                      │   │
│  │  Periods: daily | weekly | monthly | quarterly                      │   │
│  │                                                                      │   │
│  │  Metrics calculated:                                                 │   │
│  │  • Quality score = weighted avg of finding rates                    │   │
│  │  • Velocity = PRs merged / time                                     │   │
│  │  • Coverage = % code with analysis                                  │   │
│  │  • SLA compliance = % reviews on time                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                 │                                          │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    OUTPUT ENDPOINTS                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  GET /api/v1/statistics                                                      │
│      └── Aggregated overview                                                │
│                                                                              │
│  GET /api/v1/statistics/quality                                              │
│      └── Code quality trends                                                │
│      └── Finding distribution                                               │
│      └── Severity trends over time                                          │
│                                                                              │
│  GET /api/v1/statistics/velocity                                             │
│      └── PR throughput                                                      │
│      └── Review cycle time                                                  │
│      └── Time to merge                                                      │
│                                                                              │
│  GET /api/v1/statistics/team                                                 │
│      └── Per-member metrics                                                 │
│      └── Workload distribution                                              │
│      └── Response times                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Reviewer Analytics Flow (My Analytics)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REVIEWER ANALYTICS FLOW                                 │
│                                                                              │
│  Page: /dashboard/reviewer/analytics                                         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    PERSONAL METRICS                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  VOLUME METRICS                                                     │     │
│  │  ──────────────                                                     │     │
│  │  • Reviews completed (this week/month)                              │     │
│  │  • Reviews declined                                                 │     │
│  │  • Comments made                                                    │     │
│  │  • Change requests created                                          │     │
│  │  • Lines of code reviewed                                           │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  QUALITY METRICS                                                    │     │
│  │  ───────────────                                                    │     │
│  │  • Review depth (avg comments per review)                           │     │
│  │  • Issues found rate                                                │     │
│  │  • False positive rate                                              │     │
│  │  • Impact score (issues found that were fixed)                      │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  SLA METRICS                                                        │     │
│  │  ───────────                                                        │     │
│  │  • Average response time (hours)                                    │     │
│  │  • SLA compliance %                                                 │     │
│  │  • Overdue reviews count                                            │     │
│  │  • Fastest/slowest review times                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  TRENDS & CHARTS                                                    │     │
│  │  ───────────────                                                    │     │
│  │  • Reviews over time (line chart)                                   │     │
│  │  • Response time trend                                              │     │
│  │  • Quality score trend                                              │     │
│  │  • Comparison vs team average                                       │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Team Analytics Flow (Lead Only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TEAM ANALYTICS FLOW                                     │
│                                                                              │
│  Page: /dashboard/reviewer/team-analytics                                    │
│  Access: REVIEWER_LEAD only                                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    TEAM OVERVIEW                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  TEAM KPIs                                                          │     │
│  │  ─────────                                                          │     │
│  │  • Total reviewers: 8                                               │     │
│  │  • Active this week: 6                                              │     │
│  │  • Avg reviews/member: 4.2                                          │     │
│  │  • Team SLA compliance: 92%                                         │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  WORKLOAD DISTRIBUTION                                              │     │
│  │  ──────────────────────                                             │     │
│  │                                                                     │     │
│  │  Alice Chen (Senior)    ████████████░░░░ 75%  [12 reviews]         │     │
│  │  Bob Smith (Junior)     ██████░░░░░░░░░░ 40%  [6 reviews]          │     │
│  │  Carol Davis (Senior)   ██████████████░░ 90%  [15 reviews]         │     │
│  │  David Lee (Junior)     ████░░░░░░░░░░░░ 25%  [4 reviews]          │     │
│  │                                                                     │     │
│  │  [Rebalance] button → Auto-redistribute pending reviews            │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  MEMBER COMPARISON                                                  │     │
│  │  ─────────────────                                                  │     │
│  │                                                                     │     │
│  │  Member       │ Completed │ Avg Time │ Quality │ SLA %             │     │
│  │  ─────────────┼───────────┼──────────┼─────────┼───────            │     │
│  │  Alice Chen   │    12     │   35min  │   92%   │  95%              │     │
│  │  Bob Smith    │     6     │   55min  │   78%   │  83%              │     │
│  │  Carol Davis  │    15     │   28min  │   95%   │  98%              │     │
│  │  David Lee    │     4     │   62min  │   72%   │  75%              │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  BOTTLENECKS & ALERTS                                               │     │
│  │  ────────────────────                                               │     │
│  │                                                                     │     │
│  │  ⚠️ 3 reviews overdue (>24h)                                        │     │
│  │  ⚠️ Bob Smith has 2 escalations pending                            │     │
│  │  ⚠️ Unassigned reviews: 5                                           │     │
│  │                                                                     │     │
│  │  [View Details] [Quick Assign]                                      │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. FLUX NOTIFICATIONS

### 6.1 Notification Triggers Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION TRIGGERS MATRIX                              │
│                                                                              │
│  Event                    │ Recipients           │ Channels                 │
│  ─────────────────────────┼──────────────────────┼─────────────────────────│
│                           │                      │                          │
│  ANALYSIS EVENTS          │                      │                          │
│  ─────────────────        │                      │                          │
│  analysis.started         │ PR author            │ in_app                   │
│  analysis.completed       │ PR author, watchers  │ email, in_app, push     │
│  analysis.failed          │ PR author, admins    │ email, in_app, slack    │
│                           │                      │                          │
│  ASSIGNMENT EVENTS        │                      │                          │
│  ─────────────────        │                      │                          │
│  assignment.new           │ Assigned reviewer    │ email, in_app, push     │
│  assignment.reminder      │ Assigned reviewer    │ email, in_app           │
│  assignment.reassigned    │ Old + New reviewer   │ in_app                   │
│                           │                      │                          │
│  REVIEW EVENTS            │                      │                          │
│  ─────────────────        │                      │                          │
│  review.started           │ PR author            │ in_app                   │
│  review.submitted         │ PR author            │ email, in_app, push     │
│  review.overdue           │ Reviewer, lead       │ email, slack            │
│  review.escalated         │ Senior/Lead          │ email, in_app, push     │
│                           │                      │                          │
│  COMMENT EVENTS           │                      │                          │
│  ─────────────────        │                      │                          │
│  comment.new              │ PR author, mentioned │ in_app, push            │
│  comment.reply            │ Original commenter   │ in_app                   │
│  comment.resolved         │ Comment author       │ in_app                   │
│                           │                      │                          │
│  CHANGE REQUEST EVENTS    │                      │                          │
│  ─────────────────        │                      │                          │
│  change_request.created   │ PR author            │ email, in_app           │
│  change_request.resolved  │ CR author            │ in_app                   │
│  change_request.blocking  │ PR author, lead      │ email, in_app, slack    │
│                           │                      │                          │
│  MENTION EVENTS           │                      │                          │
│  ─────────────────        │                      │                          │
│  mention                  │ Mentioned user       │ email, in_app, push     │
│                           │                      │                          │
│  TEAM EVENTS              │                      │                          │
│  ─────────────────        │                      │                          │
│  member.invited           │ New member           │ email                    │
│  member.removed           │ Removed member       │ email                    │
│  role.changed             │ Affected member      │ in_app                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Notification Delivery Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION DELIVERY FLOW                                │
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │   Event Occurs   │                                                        │
│  │  (e.g. analysis  │                                                        │
│  │   completed)     │                                                        │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │  NotificationService.notify(event_type, context)                  │       │
│  └────────┬─────────────────────────────────────────────────────────┘       │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │  1. DETERMINE RECIPIENTS                                          │       │
│  │  ──────────────────────                                           │       │
│  │  • Direct recipients (PR author, assigned reviewer)              │       │
│  │  • Watchers (users watching repo/project)                        │       │
│  │  • Mentioned users (parsed from @mentions)                       │       │
│  │  • Role-based (admins for errors, leads for escalations)         │       │
│  └────────┬─────────────────────────────────────────────────────────┘       │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │  2. LOAD PREFERENCES (for each recipient)                         │       │
│  │  ─────────────────────────────────────                            │       │
│  │  • Which channels enabled for this event type                    │       │
│  │  • Quiet hours check                                              │       │
│  │  • Aggregation preferences (instant vs digest)                   │       │
│  └────────┬─────────────────────────────────────────────────────────┘       │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │  3. DISPATCH TO CHANNELS                                          │       │
│  │  ────────────────────────                                         │       │
│  │                                                                   │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │       │
│  │  │   EMAIL     │  │   IN_APP    │  │    PUSH     │              │       │
│  │  │             │  │             │  │             │              │       │
│  │  │ SMTP queue  │  │ DB insert   │  │ FCM/APNs   │              │       │
│  │  │ + template  │  │ + WebSocket │  │ + payload   │              │       │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │       │
│  │                                                                   │       │
│  │  ┌─────────────┐  ┌─────────────┐                               │       │
│  │  │   SLACK     │  │   TEAMS     │                               │       │
│  │  │             │  │             │                               │       │
│  │  │ Webhook     │  │ Webhook     │                               │       │
│  │  │ + blocks    │  │ + adaptive  │                               │       │
│  │  └─────────────┘  └─────────────┘                               │       │
│  │                                                                   │       │
│  └──────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. FLUX COMPLET: DEVELOPER → REVIEWER → DEVELOPER

### 7.1 Scénario Complet End-to-End

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              COMPLETE FLOW: PR SUBMISSION TO MERGE                           │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  PHASE 1: DEVELOPER SUBMITS PR                                               │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  DEVELOPER                                                                   │
│  ─────────                                                                   │
│       │                                                                      │
│       │ [1] Push code to feature branch                                     │
│       ▼                                                                      │
│  ┌─────────────┐     GitHub Webhook      ┌─────────────┐                    │
│  │   GitHub    │ ───────────────────────►│   Backend   │                    │
│  │             │   POST /webhooks/github │             │                    │
│  └─────────────┘                         └──────┬──────┘                    │
│                                                 │                           │
│       │ [2] Create Pull Request                 │                           │
│       ▼                                         │                           │
│  ┌─────────────┐     PR Event            │                                  │
│  │   GitHub    │ ───────────────────────►│                                  │
│  │   PR #456   │                         │                                  │
│  └─────────────┘                         ▼                                  │
│                                    ┌─────────────┐                          │
│                                    │  Analysis   │                          │
│                                    │  Created    │                          │
│                                    │  (QUEUED)   │                          │
│                                    └──────┬──────┘                          │
│                                           │                                 │
│  ═══════════════════════════════════════════════════════════════════════    │
│  PHASE 2: ANALYSIS PROCESSING                                                │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                           │                                 │
│                                           ▼                                 │
│                                    ┌─────────────┐                          │
│                                    │   Celery    │                          │
│                                    │   Worker    │                          │
│                                    └──────┬──────┘                          │
│                                           │                                 │
│                    ┌──────────────────────┼──────────────────────┐          │
│                    ▼                      ▼                      ▼          │
│             ┌───────────┐          ┌───────────┐          ┌───────────┐    │
│             │  Parse    │          │  Static   │          │    LLM    │    │
│             │  Diff     │          │  Analysis │          │  Analysis │    │
│             └───────────┘          └───────────┘          └───────────┘    │
│                    │                      │                      │          │
│                    └──────────────────────┼──────────────────────┘          │
│                                           ▼                                 │
│                                    ┌─────────────┐                          │
│                                    │  Findings   │                          │
│                                    │  Generated  │                          │
│                                    │  (8 issues) │                          │
│                                    └──────┬──────┘                          │
│                                           │                                 │
│                                           ▼                                 │
│                                    ┌─────────────┐                          │
│                                    │  Analysis   │                          │
│                                    │  COMPLETED  │                          │
│                                    └──────┬──────┘                          │
│                                           │                                 │
│       ┌───────────────────────────────────┼───────────────────────────┐    │
│       ▼                                   ▼                           ▼    │
│  ┌─────────────┐                   ┌─────────────┐              ┌────────┐ │
│  │ Notify      │                   │ Auto-Assign │              │ Update │ │
│  │ Developer   │                   │ Reviewers   │              │ GitHub │ │
│  │ (analysis   │                   │             │              │ Status │ │
│  │  complete)  │                   │             │              │        │ │
│  └─────────────┘                   └──────┬──────┘              └────────┘ │
│                                           │                                 │
│  ═══════════════════════════════════════════════════════════════════════    │
│  PHASE 3: REVIEW ASSIGNMENT                                                  │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                           │                                 │
│                                           ▼                                 │
│                                    ┌─────────────┐                          │
│                                    │  Calculate  │                          │
│                                    │  Reviewer   │                          │
│                                    │  Scores     │                          │
│                                    └──────┬──────┘                          │
│                                           │                                 │
│                                           ▼                                 │
│                            ┌──────────────────────────┐                     │
│                            │  Alice Chen (Senior)     │                     │
│                            │  Score: 0.87             │                     │
│                            │  Specialty: TypeScript ✓ │                     │
│                            │  Workload: 3/5 reviews   │                     │
│                            └────────────┬─────────────┘                     │
│                                         │                                   │
│                                         ▼                                   │
│                                  ┌─────────────┐                            │
│                                  │ Assignment  │                            │
│                                  │ Created     │                            │
│                                  │ (PENDING)   │                            │
│                                  └──────┬──────┘                            │
│                                         │                                   │
│                                         ▼                                   │
│                                  ┌─────────────┐                            │
│                                  │ Notify      │                            │
│                                  │ Alice       │                            │
│                                  │ (new assign)│                            │
│                                  └─────────────┘                            │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  PHASE 4: REVIEW PROCESS                                                     │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  REVIEWER (Alice)                                                            │
│  ────────────────                                                            │
│       │                                                                      │
│       │ [1] See notification in queue                                       │
│       │     /dashboard/reviewer/queue                                       │
│       │                                                                      │
│       │ [2] Click "Start Review"                                            │
│       │     PUT /reviews/assignments/{id}/start                             │
│       ▼                                                                      │
│  ┌─────────────┐                                                             │
│  │ Assignment  │                                                             │
│  │ IN_PROGRESS │                                                             │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         │ [3] Open review interface                                         │
│         │     /dashboard/review/{id}                                        │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     REVIEW INTERFACE                                 │    │
│  │  ─────────────────────────────────────────────────────────────────  │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │  CODE DIFF VIEW                                               │   │    │
│  │  │  ────────────────                                             │   │    │
│  │  │  + import { auth } from './auth'                              │   │    │
│  │  │  + const token = process.env.API_KEY  ← [AI] Secret detected │   │    │
│  │  │  + export function login() { ... }                            │   │    │
│  │  │                                                               │   │    │
│  │  │  [💬 Add Comment]  [⚠️ Request Change]  [✓ Approve Line]     │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │  AI FINDINGS PANEL                                            │   │    │
│  │  │  ─────────────────                                            │   │    │
│  │  │  🔴 Critical: Hardcoded API key (line 5)                      │   │    │
│  │  │  🟡 Warning: Missing error handling (line 12)                 │   │    │
│  │  │  🔵 Info: Consider using async/await (line 8)                 │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │                                                                    │
│         │ [4] Add comments & change requests                                │
│         │     POST /reviews/{id}/comments                                   │
│         │     POST /reviews/{id}/change-requests                            │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │ Comments    │     ┌───────────────────────────────────────────────────┐  │
│  │ Created     │────►│ Notify Developer (new comment on line 5)          │  │
│  └─────────────┘     └───────────────────────────────────────────────────┘  │
│         │                                                                    │
│         │ [5] Submit final decision                                         │
│         │     POST /reviews/submit                                          │
│         │     decision: "request_changes"                                   │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │ Review      │     ┌───────────────────────────────────────────────────┐  │
│  │ SUBMITTED   │────►│ Notify Developer (changes requested)              │  │
│  │ (changes    │     └───────────────────────────────────────────────────┘  │
│  │  requested) │                                                             │
│  └─────────────┘                                                             │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  PHASE 5: DEVELOPER ADDRESSES FEEDBACK                                       │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  DEVELOPER                                                                   │
│  ─────────                                                                   │
│       │                                                                      │
│       │ [1] See notification (changes requested)                            │
│       │     /dashboard (notifications bell)                                 │
│       │                                                                      │
│       │ [2] View review feedback                                            │
│       │     /dashboard/review/{id}                                          │
│       │                                                                      │
│       │ [3] Fix code locally                                                │
│       │                                                                      │
│       │ [4] Push new commit                                                 │
│       ▼                                                                      │
│  ┌─────────────┐                                                             │
│  │   GitHub    │     Webhook (push event)                                   │
│  │  new commit │ ─────────────────────────►  New Analysis triggered         │
│  └─────────────┘                                                             │
│                                                                              │
│       │ [5] Resolve change requests                                         │
│       │     PUT /reviews/change-requests/{id}/resolve                       │
│       ▼                                                                      │
│  ┌─────────────┐     ┌───────────────────────────────────────────────────┐  │
│  │ CR Resolved │────►│ Notify Reviewer (change request resolved)         │  │
│  └─────────────┘     └───────────────────────────────────────────────────┘  │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  PHASE 6: FINAL APPROVAL                                                     │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  REVIEWER (Alice)                                                            │
│  ────────────────                                                            │
│       │                                                                      │
│       │ [1] See notification (CR resolved)                                  │
│       │                                                                      │
│       │ [2] Re-review changes                                               │
│       │     New analysis shows 0 critical issues                            │
│       │                                                                      │
│       │ [3] Submit approval                                                 │
│       │     POST /reviews/submit                                            │
│       │     decision: "approve"                                             │
│       ▼                                                                      │
│  ┌─────────────┐                                                             │
│  │ Review      │     ┌───────────────────────────────────────────────────┐  │
│  │ APPROVED    │────►│ Notify Developer (PR approved!)                   │  │
│  └─────────────┘     │ Update GitHub PR status (approved)                │  │
│                      └───────────────────────────────────────────────────┘  │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  PHASE 7: MERGE                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  DEVELOPER                                                                   │
│  ─────────                                                                   │
│       │                                                                      │
│       │ [1] Merge PR on GitHub                                              │
│       ▼                                                                      │
│  ┌─────────────┐     Webhook (PR merged)                                    │
│  │   GitHub    │ ─────────────────────────►                                 │
│  │  PR Merged  │                                                            │
│  └─────────────┘                                                             │
│                      ┌───────────────────────────────────────────────────┐  │
│                      │ • Update branch merge_status = 'merged'           │  │
│                      │ • Update statistics (PRs merged, cycle time)      │  │
│                      │ • Update reviewer metrics                          │  │
│                      │ • Archive analysis                                 │  │
│                      └───────────────────────────────────────────────────┘  │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                           FLOW COMPLETE                                      │
│  ═══════════════════════════════════════════════════════════════════════    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. CONNEXIONS MANQUANTES (À IMPLÉMENTER)

### 8.1 Tableau des Déconnexions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MISSING CONNECTIONS                                       │
│                                                                              │
│  #  │ Component              │ Issue                    │ Priority          │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  1  │ DashboardContent.tsx   │ Uses hardcoded mock data │ 🔴 CRITICAL       │
│     │                        │ instead of API calls     │                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  2  │ ReviewerDashboard.tsx  │ API call commented out,  │ 🔴 CRITICAL       │
│     │                        │ uses mockDashboardData   │                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  3  │ ReviewQueue.tsx        │ Uses mockQueueData       │ 🔴 CRITICAL       │
│     │                        │ instead of /reviews/queue│                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  4  │ LiveActivityFeed.tsx   │ Generates random msgs    │ 🟠 HIGH           │
│     │                        │ instead of real events   │                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  5  │ JuniorReviewInterface  │ Uses mockAnalysis        │ 🟠 HIGH           │
│     │                        │ instead of API fetch     │                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  6  │ SeniorReviewInterface  │ Uses mockAnalysis        │ 🟠 HIGH           │
│     │                        │ instead of API fetch     │                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  7  │ Notifications          │ Not integrated into      │ 🔴 CRITICAL       │
│     │                        │ workflow events          │                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  8  │ Auto-assignment        │ Service exists but not   │ 🟠 HIGH           │
│     │                        │ triggered after analysis │                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  9  │ Team Analytics         │ Page exists but no       │ 🟡 MEDIUM         │
│     │                        │ data fetching            │                   │
│  ───┼────────────────────────┼──────────────────────────┼─────────────────  │
│  10 │ My Analytics           │ Page exists but no       │ 🟡 MEDIUM         │
│     │                        │ data fetching            │                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Plan d'Implémentation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION PLAN                                       │
│                                                                              │
│  PHASE 1: Core Dashboard Connections (Week 1)                               │
│  ─────────────────────────────────────────────                              │
│  □ 1.1 Connect DashboardContent.tsx to /api/dashboard/analyses              │
│  □ 1.2 Connect ReviewerDashboard.tsx to /api/dashboard/reviewer             │
│  □ 1.3 Connect ReviewQueue.tsx to /api/reviews/assignments                  │
│                                                                              │
│  PHASE 2: Review Interface Connections (Week 2)                             │
│  ──────────────────────────────────────────────                             │
│  □ 2.1 Connect JuniorReviewInterface to real analysis data                  │
│  □ 2.2 Connect SeniorReviewInterface to real analysis data                  │
│  □ 2.3 Implement comment submission to API                                  │
│  □ 2.4 Implement change request submission to API                           │
│                                                                              │
│  PHASE 3: Notification Integration (Week 3)                                 │
│  ──────────────────────────────────────────                                 │
│  □ 3.1 Create useNotifications hook                                         │
│  □ 3.2 Integrate notifications into header bell                             │
│  □ 3.3 Connect workflow events to notification triggers                     │
│  □ 3.4 Implement real-time updates (polling/WebSocket)                      │
│                                                                              │
│  PHASE 4: Analytics & Statistics (Week 4)                                   │
│  ────────────────────────────────────────                                   │
│  □ 4.1 Connect My Analytics to /api/reviewer/metrics                        │
│  □ 4.2 Connect Team Analytics to /api/reviewer/team-metrics                 │
│  □ 4.3 Connect LiveActivityFeed to real events                              │
│  □ 4.4 Connect Statistics page to /api/statistics                           │
│                                                                              │
│  PHASE 5: Auto-Assignment Integration (Week 5)                              │
│  ─────────────────────────────────────────────                              │
│  □ 5.1 Trigger auto-assignment after analysis completion                    │
│  □ 5.2 UI for manual assignment (Lead only)                                 │
│  □ 5.3 Reassignment workflow                                                │
│  □ 5.4 Escalation workflow (Junior → Senior)                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. DIAGRAMME RELATIONNEL COMPLET

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ENTITY RELATIONSHIP DIAGRAM                               │
│                                                                              │
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │  Organization   │◄────────│     User        │                            │
│  │                 │   N:M   │                 │                            │
│  │  - id           │  via    │  - id           │                            │
│  │  - name         │ member- │  - email        │                            │
│  │  - tier         │  ship   │  - role         │                            │
│  └────────┬────────┘         └────────┬────────┘                            │
│           │                           │                                     │
│           │ 1:N                       │ 1:N                                 │
│           ▼                           │                                     │
│  ┌─────────────────┐                  │                                     │
│  │   Repository    │                  │                                     │
│  │                 │                  │                                     │
│  │  - id           │                  │                                     │
│  │  - full_name    │                  │                                     │
│  │  - settings     │                  │                                     │
│  └────────┬────────┘                  │                                     │
│           │                           │                                     │
│           │ 1:N                       │                                     │
│           ▼                           │                                     │
│  ┌─────────────────┐                  │                                     │
│  │     Branch      │                  │                                     │
│  │                 │                  │                                     │
│  │  - id           │                  │                                     │
│  │  - name         │                  │                                     │
│  │  - type         │                  │                                     │
│  │  - protected    │                  │                                     │
│  └────────┬────────┘                  │                                     │
│           │                           │                                     │
│           │ 1:N                       │                                     │
│           ▼                           ▼                                     │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │    Analysis     │◄────────│ReviewAssignment │                            │
│  │                 │   1:N   │                 │                            │
│  │  - id           │         │  - id           │                            │
│  │  - status       │         │  - reviewer_id  │──────────────────┐        │
│  │  - findings     │         │  - status       │                  │        │
│  │  - summary      │         │  - priority     │                  │        │
│  └────────┬────────┘         └────────┬────────┘                  │        │
│           │                           │                           │        │
│           │                           │ 1:N                       │        │
│           │                           ▼                           │        │
│           │                  ┌─────────────────┐                  │        │
│           │                  │     Review      │                  │        │
│           │                  │                 │                  │        │
│           │                  │  - id           │                  │        │
│           │                  │  - decision     │                  │        │
│           │                  │  - submitted_at │                  │        │
│           │                  └────────┬────────┘                  │        │
│           │                           │                           │        │
│           │              ┌────────────┼────────────┐              │        │
│           │              │            │            │              │        │
│           │              ▼            ▼            ▼              │        │
│           │     ┌────────────┐ ┌────────────┐ ┌────────────┐     │        │
│           │     │  Comment   │ │  Change    │ │ Reviewer   │     │        │
│           │     │            │ │  Request   │ │  Metrics   │◄────┘        │
│           │     │ - content  │ │            │ │            │              │
│           │     │ - line_num │ │ - title    │ │ - completed│              │
│           │     │ - status   │ │ - blocking │ │ - avg_time │              │
│           │     └────────────┘ └────────────┘ └────────────┘              │
│           │                                                               │
│           │ triggers                                                      │
│           ▼                                                               │
│  ┌─────────────────┐                                                      │
│  │  Notification   │                                                      │
│  │                 │                                                      │
│  │  - event_type   │                                                      │
│  │  - recipient_id │                                                      │
│  │  - channel      │                                                      │
│  │  - read         │                                                      │
│  └─────────────────┘                                                      │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 10. RÉSUMÉ EXÉCUTIF

### Ce qui est implémenté ✅

| Domaine | Backend API | Frontend UI | Connexion |
|---------|-------------|-------------|-----------|
| Auth & Roles | ✅ | ✅ | ✅ |
| Organizations | ✅ | ⚠️ Partiel | ⚠️ |
| Repositories | ✅ | ⚠️ Partiel | ⚠️ |
| Branches | ✅ | ⚠️ Partiel | ⚠️ |
| Analysis Pipeline | ✅ | ✅ | ✅ |
| Developer Dashboard | ✅ | ✅ (ancien) | ✅ |
| New Dashboard | ✅ | ✅ | ❌ Mock |
| Reviewer Dashboard | ✅ | ✅ | ❌ Mock |
| Review Queue | ✅ | ✅ | ❌ Mock |
| Review Interface | ✅ | ✅ | ❌ Mock |
| Notifications | ✅ | ⚠️ Partiel | ❌ |
| Statistics | ✅ | ⚠️ Partiel | ⚠️ |
| Team Analytics | ✅ | ✅ | ❌ Mock |


-pour le moument aucun notification fionctionne . les mettres fonctionnes completemnt
-concentere dans la logique de laison entres diffrents roles dans les workfolw et les flowfontend et backend 
-assurer que tout les elemnt dans tout les interface sont fontionne correctemnt selon un logique avec tout les autres choses qui ont relier avec
### Priorités d'Implémentation

1. **🔴 CRITIQUE**: Connecter les dashboards aux vraies APIs
2. **🔴 CRITIQUE**: Intégrer le système de notifications
3. **🟠 HAUTE**: Connecter les interfaces de review
4. **🟠 HAUTE**: Activer l'auto-assignment
5. **🟡 MOYENNE**: Connecter les analytics

---

*Document généré le 2026-04-03*
*Version: 1.0*
