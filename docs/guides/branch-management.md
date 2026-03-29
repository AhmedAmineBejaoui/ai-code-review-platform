# Schémas Visuels - Système de Gestion des Branches

Ce document contient les diagrammes visuels pour le système de gestion des branches.

## 1. ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    organizations ||--o{ branches : "has"
    organizations ||--o{ branch_protection_rules : "has"
    organizations ||--o{ branch_permissions : "has"
    organizations ||--o{ branch_reviewer_assignments : "has"
    organizations ||--o{ branch_policies : "has"
    organizations ||--o{ branch_merge_requests : "has"
    organizations ||--o{ branch_audit_logs : "has"

    users ||--o{ branches : "creates"
    users ||--o{ branches : "merges"
    users ||--o{ branch_protection_rules : "creates"
    users ||--o{ branch_reviewer_assignments : "reviewer"
    users ||--o{ branch_reviewer_assignments : "created_by"
    users ||--o{ branch_policies : "creates"
    users ||--o{ branch_merge_requests : "author"
    users ||--o{ branch_audit_logs : "actor"

    roles ||--o{ branch_permissions : "has"

    branches ||--o{ branch_protection_rules : "protected_by"
    branches ||--o{ branch_reviewer_assignments : "assigned_to"
    branches ||--o{ branch_merge_requests : "source"
    branches ||--o{ branch_merge_requests : "target"
    branches ||--o{ branch_audit_logs : "subject"
    branches ||--o{ analyses : "source"
    branches ||--o{ analyses : "target"
    branches ||--o{ project_profiles : "default"
    branches ||--o{ review_assignments : "context"

    analyses ||--o{ branch_merge_requests : "triggers"

    branches {
        text id PK
        text repo_id
        text org_id FK
        text branch_name
        text branch_type "main,develop,feature,hotfix,release,custom"
        text branch_pattern
        text last_commit_sha
        text last_commit_author
        text last_commit_message
        timestamptz last_commit_at
        text created_by FK
        timestamptz created_at
        text base_branch
        text merged_into
        text merge_status "open,merged,closed,deleted"
        timestamptz merged_at
        text merged_by FK
        boolean is_protected
        boolean is_default
        boolean is_active
        integer ahead_count
        integer behind_count
        timestamptz last_synced_at
        text description
        jsonb metadata_json
        timestamptz updated_at
    }

    branch_protection_rules {
        text id PK
        text branch_id FK
        text org_id FK
        text repo_id
        text branch_pattern
        text applies_to_type "main,develop,feature,hotfix,release,all"
        boolean require_pull_request
        integer required_approvals
        boolean require_code_owner_review
        boolean dismiss_stale_reviews
        boolean require_review_from_lead
        boolean block_direct_commits
        boolean allow_force_pushes
        boolean allow_deletions
        boolean require_status_checks
        jsonb required_status_checks
        boolean require_branches_up_to_date
        boolean auto_assign_reviewers
        jsonb required_reviewer_roles
        jsonb allowed_merge_roles
        jsonb allowed_push_roles
        jsonb bypass_roles
        boolean is_active
        text enforcement_level "strict,moderate,advisory"
        text created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    branch_permissions {
        text id PK
        text org_id FK
        text role_id FK
        text branch_type "main,develop,feature,hotfix,release,custom"
        text repo_id
        boolean can_create_branch
        boolean can_delete_branch
        boolean can_rename_branch
        boolean can_merge_to_branch
        boolean can_force_push
        boolean can_push
        boolean can_configure_protection
        boolean can_bypass_protection
        boolean can_approve_merges
        boolean can_block_merges
        boolean can_set_default_branch
        boolean can_archive_branch
        timestamptz created_at
        timestamptz updated_at
    }

    branch_reviewer_assignments {
        text id PK
        text org_id FK
        text repo_id
        text branch_id FK
        text branch_pattern
        text branch_type
        text reviewer_id FK
        text assignment_type "manual,auto,codeowner"
        boolean auto_assign_on_pr
        integer priority
        jsonb conditions
        boolean is_active
        text created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    branch_policies {
        text id PK
        text org_id FK
        text policy_name
        text policy_type "naming,workflow,protection,merge_strategy"
        jsonb branch_naming_patterns
        boolean enforce_naming
        boolean require_base_branch
        jsonb allowed_base_branches
        boolean auto_delete_on_merge
        integer max_branch_age_days
        jsonb allowed_merge_methods
        text default_merge_method "merge,squash,rebase"
        jsonb applies_to_repos
        boolean is_active
        integer priority
        text description
        text created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    branch_merge_requests {
        text id PK
        text analysis_id FK
        text org_id FK
        text repo_id
        text source_branch_id FK
        text target_branch_id FK
        text source_branch_name
        text target_branch_name
        integer pr_number
        text pr_title
        text pr_author FK
        text status "open,approved,changes_requested,merged,closed"
        text merge_method "merge,squash,rebase"
        integer required_approvals
        integer approvals_count
        jsonb approvers
        jsonb blockers
        text checks_status "pending,passing,failing"
        jsonb checks_details
        timestamptz created_at
        timestamptz updated_at
        timestamptz merged_at
        timestamptz closed_at
    }

    branch_audit_logs {
        text id PK
        text branch_id FK
        text org_id FK
        text repo_id
        text action
        text actor_id FK
        text actor_role
        text branch_name
        text target_branch_name
        jsonb action_metadata
        boolean success
        text error_message
        timestamptz created_at
    }

    analyses {
        text id PK
        text source_branch_id FK
        text target_branch_id FK
        text source_branch_name
        text target_branch_name
        text branch_type
    }

    project_profiles {
        text repo_id PK
        text default_branch_id FK
        text default_branch_name
        integer active_branches_count
        integer protected_branches_count
    }

    review_assignments {
        text id PK
        text branch_id FK
        text branch_type
        text assigned_by_rule
    }

    organizations {
        text id PK
        text slug
        text name
        boolean is_active
    }

    users {
        text id PK
        text email
        text display_name
    }

    roles {
        text id PK
        text code
        text label
    }
```

## 2. Diagramme de Séquence : Créer Feature Branch

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant UI as Dashboard UI
    participant API as Backend API
    participant Auth as Auth Middleware
    participant RBAC as RBAC Service
    participant PolicyVal as Branch Policy Validator
    participant DB as Database
    participant Audit as Audit Logger

    Dev->>UI: Clique "New Branch"
    UI->>Dev: Affiche formulaire
    Dev->>UI: Remplit (name, base, type)
    UI->>API: POST /branches

    API->>Auth: Vérifier token
    Auth->>RBAC: Check permission "branches.create"
    RBAC-->>Auth: ✅ Permission granted
    Auth-->>API: User authenticated

    API->>PolicyVal: Validate branch name
    PolicyVal->>DB: Get org policies (naming)
    DB-->>PolicyVal: Naming patterns
    PolicyVal->>PolicyVal: Check regex match
    PolicyVal-->>API: ✅ Name valid

    API->>DB: INSERT INTO branches
    DB-->>API: Branch created (id, metadata)

    API->>Audit: Log "create" action
    Audit->>DB: INSERT INTO branch_audit_logs

    API-->>UI: 201 Created {branch}
    UI-->>Dev: ✅ "Branch créée avec succès"
```

## 3. Diagramme de Séquence : Merge vers Main (Rejeté)

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GH as GitHub
    participant Webhook as Webhook Handler
    participant DB as Database
    participant Protection as Branch Protection Service
    participant RBAC as RBAC Service
    participant Notif as Notification Service

    Dev->>GH: Crée PR (feature → main)
    GH->>Webhook: POST /webhooks/github

    Webhook->>Webhook: Validate HMAC signature
    Webhook->>DB: Get/Create branch records
    DB-->>Webhook: source_branch, target_branch

    Webhook->>DB: Create analysis + branch_merge_request
    DB-->>Webhook: analysis_id, merge_request_id

    Webhook->>Protection: Validate merge operation
    Protection->>DB: Get protection rules (target: main)
    DB-->>Protection: Protection rules found

    Protection->>Protection: Check requirements
    Note over Protection: - Required approvals: 2<br/>- Required roles: reviewer_lead<br/>- Block direct commits: true

    Protection->>RBAC: Check user permissions
    Note over RBAC: User role: developer<br/>Permission: merge.approve_main
    RBAC-->>Protection: ❌ Permission denied

    Protection-->>Webhook: ❌ Validation failed

    Webhook->>DB: Update merge_request status='blocked'
    Webhook->>GH: Add comment on PR
    Note over GH: "⚠️ This PR cannot be merged<br/>Required: 2 approvals from Reviewer Lead"

    Webhook->>Notif: Send notification to Dev
    Notif->>Dev: 📧 Email notification

    Webhook-->>GH: 200 OK
```

## 4. Diagramme de Séquence : Configurer Protection pour Main

```mermaid
sequenceDiagram
    actor Lead as Reviewer Lead
    participant UI as Settings UI
    participant API as Backend API
    participant Auth as Auth Middleware
    participant RBAC as RBAC Service
    participant Protection as Branch Protection Service
    participant DB as Database
    participant Audit as Audit Logger
    participant Notif as Notification Service

    Lead->>UI: Navigate to Branch Protection
    UI->>API: GET /branch-protection?org_id=...
    API->>DB: SELECT from branch_protection_rules
    DB-->>API: Existing rules
    API-->>UI: List of rules

    Lead->>UI: Click "New Protection Rule"
    Lead->>UI: Configure rules
    Note over Lead,UI: - Target: main<br/>- Required approvals: 2<br/>- Required roles: reviewer_lead<br/>- Block direct commits: true<br/>- Status checks: ci-tests, security-scan

    UI->>API: POST /branch-protection

    API->>Auth: Verify token
    Auth->>RBAC: Check "protection.configure"
    RBAC-->>Auth: ✅ Permission granted (Reviewer Lead)

    API->>DB: INSERT INTO branch_protection_rules
    DB-->>API: Rule created (id)

    API->>Protection: Apply rule to branches
    Protection->>DB: SELECT branches WHERE branch_type='main'
    DB-->>Protection: List of main branches
    Protection->>DB: UPDATE branches SET is_protected=true

    API->>Audit: Log "protect" action
    Audit->>DB: INSERT INTO branch_audit_logs

    API->>Notif: Notify team admins
    Notif->>Notif: Send notifications

    API-->>UI: 201 Created {rule}
    UI-->>Lead: ✅ "Protection configurée"
```

## 5. Diagramme de Séquence : PR avec Auto-Assignation

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant GH as GitHub
    participant Webhook as Webhook Handler
    participant Analysis as Analysis Service
    participant AutoAssign as Branch Review Assignment Service
    participant DB as Database
    participant Notif as Notification Service
    participant Rev as Reviewer Senior

    Dev->>GH: Create PR (feature → develop)
    GH->>Webhook: POST /webhooks/github<br/>event: pull_request.opened

    Webhook->>Webhook: Validate & Parse payload
    Webhook->>DB: Get or create branches
    DB-->>Webhook: source_branch_id, target_branch_id

    Webhook->>Analysis: Create analysis
    Analysis->>DB: INSERT INTO analyses<br/>(with branch context)
    DB-->>Analysis: analysis_id

    Webhook->>AutoAssign: assign_by_branch_rules()
    AutoAssign->>DB: Get branch_reviewer_assignments
    Note over AutoAssign,DB: WHERE branch_type='develop'<br/>AND auto_assign_on_pr=true

    DB-->>AutoAssign: Assignments list
    Note over DB,AutoAssign: reviewer_senior_bob (priority: 10)<br/>reviewer_junior_alice (priority: 5)

    AutoAssign->>AutoAssign: Sort by priority
    AutoAssign->>AutoAssign: Check availability
    AutoAssign->>DB: INSERT INTO review_assignments
    Note over DB: analysis_id, reviewer_id<br/>assigned_by_rule='auto'

    DB-->>AutoAssign: Assignment created

    AutoAssign->>Notif: Notify reviewer
    Notif->>Rev: 📧 Email + 🔔 Push notification
    Note over Rev: "New PR assigned to you"

    AutoAssign-->>Webhook: ✅ Assigned to reviewer_senior_bob
    Webhook-->>GH: 200 OK
```

## 6. Diagramme de Séquence : Approuver et Merger

```mermaid
sequenceDiagram
    actor Rev as Reviewer Senior
    participant UI as Dashboard UI
    participant API as Backend API
    participant RBAC as RBAC Service
    participant Protection as Branch Protection Service
    participant DB as Database
    participant GH as GitHub
    participant Audit as Audit Logger
    participant Dev as Developer

    Rev->>UI: View analysis details
    UI->>API: GET /analyses/{id}
    API->>DB: SELECT analysis + findings
    DB-->>API: Analysis details
    API-->>UI: Display review

    Rev->>UI: Review code + findings
    Rev->>UI: Click "Approve"

    UI->>API: POST /reviews/{id}/approve

    API->>RBAC: Check permissions
    Note over RBAC: role: reviewer_senior<br/>permission: merge.approve_develop
    RBAC-->>API: ✅ Permission granted

    API->>DB: UPDATE branch_merge_requests
    Note over DB: approvals_count++<br/>approvers.append(reviewer_id)

    API->>Protection: Validate merge requirements
    Protection->>DB: Get protection rules + merge request
    Protection->>Protection: Check conditions
    Note over Protection: ✅ Required approvals: 1/1<br/>✅ Status checks: passing<br/>✅ No blockers

    Protection-->>API: ✅ Ready to merge

    API->>DB: UPDATE status='approved'

    API->>Audit: Log approval
    Audit->>DB: INSERT INTO branch_audit_logs

    API->>GH: Update PR status (approved)
    API->>UI: ✅ Approval successful

    UI-->>Rev: "Review approved"

    opt Developer merges
        Dev->>GH: Click "Merge"
        GH->>Webhook: pull_request.closed (merged: true)
        Webhook->>DB: UPDATE branches merge_status='merged'
        Webhook->>DB: UPDATE branch_merge_requests merged_at=NOW()
    end
```

## 7. Architecture Globale du Système

```mermaid
graph TB
    subgraph "Frontend - Dashboard"
        UI[Branch Management UI]
        ProtUI[Protection Settings UI]
        PolicyUI[Policy Settings UI]
        AnalysisUI[Analysis UI avec Branch Context]
    end

    subgraph "Backend API"
        BranchAPI[Branch CRUD API]
        ProtectionAPI[Protection Rules API]
        PolicyAPI[Policy API]
        ReviewerAPI[Reviewer Assignment API]
        AnalysisAPI[Analysis API Enhanced]
    end

    subgraph "Services Métier"
        ProtectionSvc[Branch Protection Service]
        PolicyValidator[Branch Policy Validator]
        AutoAssignSvc[Branch Review Assignment Service]
        SyncSvc[Branch Sync Service GitHub]
    end

    subgraph "Data Layer"
        BranchRepo[Branch Repository]
        ProtectionRepo[Protection Repository]
        PolicyRepo[Policy Repository]
        DB[(PostgreSQL)]
    end

    subgraph "External"
        GH[GitHub]
        Webhook[GitHub Webhooks]
    end

    UI --> BranchAPI
    ProtUI --> ProtectionAPI
    PolicyUI --> PolicyAPI
    AnalysisUI --> AnalysisAPI

    BranchAPI --> ProtectionSvc
    BranchAPI --> PolicyValidator
    BranchAPI --> BranchRepo

    ProtectionAPI --> ProtectionSvc
    ProtectionAPI --> ProtectionRepo

    PolicyAPI --> PolicyValidator
    PolicyAPI --> PolicyRepo

    ReviewerAPI --> AutoAssignSvc

    AnalysisAPI --> AutoAssignSvc
    AnalysisAPI --> ProtectionSvc

    ProtectionSvc --> DB
    PolicyValidator --> DB
    AutoAssignSvc --> DB
    SyncSvc --> DB

    BranchRepo --> DB
    ProtectionRepo --> DB
    PolicyRepo --> DB

    Webhook --> AnalysisAPI
    Webhook --> SyncSvc
    SyncSvc --> GH
    GH -.->|Events| Webhook

    style UI fill:#e1f5ff
    style ProtUI fill:#e1f5ff
    style PolicyUI fill:#e1f5ff
    style AnalysisUI fill:#e1f5ff
    style ProtectionSvc fill:#fff4e6
    style PolicyValidator fill:#fff4e6
    style AutoAssignSvc fill:#fff4e6
    style SyncSvc fill:#fff4e6
    style DB fill:#f3e5f5
    style GH fill:#d7f5dd
```

## 8. Flux de Données : Événement GitHub → Système

```mermaid
flowchart TD
    Start([GitHub Event])
    Start --> Webhook{Type d'événement?}

    Webhook -->|create branch| CreateBranch[Créer branch record]
    Webhook -->|delete branch| DeleteBranch[Marquer branch deleted]
    Webhook -->|push| UpdateBranch[Mettre à jour commit info]
    Webhook -->|pull_request.opened| CreatePR[Créer PR + Analysis]

    CreateBranch --> ValidateName{Nom valide?}
    ValidateName -->|Non| RejectEvent[Rejeter + Notifier]
    ValidateName -->|Oui| InsertBranch[INSERT branches]
    InsertBranch --> CheckProtection{Protection rules?}
    CheckProtection -->|Oui| ApplyProtection[Appliquer protection]
    CheckProtection -->|Non| AuditCreate[Log audit]
    ApplyProtection --> AuditCreate
    AuditCreate --> EndSuccess([✅ Branch créée])

    DeleteBranch --> CheckCanDelete{Peut supprimer?}
    CheckCanDelete -->|Non| RejectDelete[403 Forbidden]
    CheckCanDelete -->|Oui| MarkDeleted[UPDATE merge_status='deleted']
    MarkDeleted --> AuditDelete[Log audit]
    AuditDelete --> EndDelete([✅ Branch deleted])

    UpdateBranch --> UpdateCommit[UPDATE last_commit_*]
    UpdateCommit --> SyncDiff[Calculer ahead/behind]
    SyncDiff --> AuditUpdate[Log audit]
    AuditUpdate --> EndUpdate([✅ Branch updated])

    CreatePR --> GetBranches[Get/Create branch records]
    GetBranches --> CreateAnalysis[CREATE analysis]
    CreateAnalysis --> CreateMergeReq[CREATE branch_merge_request]
    CreateMergeReq --> ValidateMerge{Protection OK?}
    ValidateMerge -->|Non| BlockPR[Status: blocked]
    ValidateMerge -->|Oui| AutoAssign[Trigger auto-assignment]
    BlockPR --> NotifyUser[Notifier user]
    AutoAssign --> FindReviewers[Trouver reviewers by branch rules]
    FindReviewers --> AssignReviewers[CREATE review_assignments]
    AssignReviewers --> NotifyReviewers[Notifier reviewers]
    NotifyUser --> EndPR([✅ PR traité])
    NotifyReviewers --> EndPR

    RejectEvent --> EndFail([❌ Rejeté])
    RejectDelete --> EndFail

    style Start fill:#d7f5dd
    style EndSuccess fill:#d7f5dd
    style EndDelete fill:#d7f5dd
    style EndUpdate fill:#d7f5dd
    style EndPR fill:#d7f5dd
    style EndFail fill:#ffebee
    style RejectEvent fill:#ffebee
    style RejectDelete fill:#ffebee
    style BlockPR fill:#fff9c4
```

---

## Notes d'Utilisation

Ces diagrammes peuvent être rendus avec :
- **Mermaid Live Editor** : https://mermaid.live/
- **GitHub** : Les blocs mermaid sont nativement supportés dans les fichiers .md
- **VS Code** : Extension "Markdown Preview Mermaid Support"
- **Documentation tools** : MkDocs, Docusaurus, etc.

## Légende des Couleurs (Diagramme Architecture)

- 🔵 **Bleu clair** : Frontend / UI
- 🟠 **Orange** : Services Métier
- 🟣 **Violet** : Base de données
- 🟢 **Vert** : Services externes (GitHub)
