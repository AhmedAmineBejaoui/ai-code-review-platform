# Branch Management API Documentation

## Overview

The Branch Management system provides a comprehensive set of APIs for managing Git branches, protection rules, and organization-level policies. This documentation covers all endpoints, schemas, and usage examples.

## Base URL

```
/v1/branches           - Branch CRUD operations
/v1/branch-protection  - Protection rules management
/v1/branch-policies    - Organization policies
```

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Branches API

### List Branches

```http
GET /v1/branches
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_id | string | No | Filter by repository ID |
| org_id | string | No | Filter by organization ID |
| branch_type | string | No | Filter by type (main, develop, feature, hotfix, release, custom) |
| is_protected | boolean | No | Filter by protection status |
| is_active | boolean | No | Filter by active status |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 50, max: 100) |

**Response:**

```json
{
  "branches": [
    {
      "id": "branch_abc123",
      "repo_id": "org/repo",
      "org_id": "org_123",
      "branch_name": "main",
      "branch_type": "main",
      "branch_pattern": null,
      "last_commit_sha": "abc123def456",
      "last_commit_author": "developer@example.com",
      "last_commit_message": "feat: add login feature",
      "last_commit_at": "2026-03-25T10:00:00Z",
      "created_by": "user_123",
      "created_at": "2026-01-01T00:00:00Z",
      "base_branch": null,
      "merged_into": null,
      "merge_status": null,
      "merged_at": null,
      "merged_by": null,
      "is_protected": true,
      "is_default": true,
      "is_active": true,
      "ahead_count": 0,
      "behind_count": 0,
      "last_synced_at": "2026-03-25T12:00:00Z",
      "description": "Main production branch",
      "metadata_json": {},
      "updated_at": "2026-03-25T12:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 50
}
```

### Create Branch

```http
POST /v1/branches
```

**Request Body:**

```json
{
  "repo_id": "org/repo",
  "org_id": "org_123",
  "branch_name": "feature/AUTH-123-oauth-integration",
  "branch_type": "feature",
  "base_branch": "develop",
  "description": "OAuth integration feature",
  "is_protected": false,
  "is_default": false
}
```

**Response (201 Created):**

```json
{
  "branch": {
    "id": "branch_xyz789",
    "branch_name": "feature/AUTH-123-oauth-integration",
    "branch_type": "feature",
    "branch_pattern": "feature/*",
    ...
  },
  "validation_warnings": null
}
```

### Get Branch

```http
GET /v1/branches/{branch_id}
```

### Update Branch

```http
PATCH /v1/branches/{branch_id}
```

**Request Body:**

```json
{
  "description": "Updated description",
  "is_protected": true,
  "is_active": true
}
```

### Delete Branch

```http
DELETE /v1/branches/{branch_id}?force=false
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| force | boolean | false | Force delete even if protected |

### Set Default Branch

```http
POST /v1/branches/{branch_id}/set-default
```

### Compare Branches

```http
GET /v1/branches/{branch_id}/compare/{target_branch_id}
```

---

## Branch Protection API

### List Protection Rules

```http
GET /v1/branch-protection?org_id=org_123
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| org_id | string | Yes | Organization ID |
| repo_id | string | No | Filter by repository |
| is_active | boolean | No | Filter by active status |

### Create Protection Rule

```http
POST /v1/branch-protection
```

**Request Body:**

```json
{
  "org_id": "org_123",
  "repo_id": "org/repo",
  "applies_to_type": "main",

  "require_pull_request": true,
  "required_approvals": 2,
  "require_code_owner_review": true,
  "dismiss_stale_reviews": true,
  "require_review_from_lead": true,

  "block_direct_commits": true,
  "allow_force_pushes": false,
  "allow_deletions": false,

  "require_status_checks": true,
  "required_status_checks": ["ci-tests", "security-scan", "lint"],
  "require_branches_up_to_date": true,

  "auto_assign_reviewers": true,
  "required_reviewer_roles": ["reviewer_lead"],

  "allowed_merge_roles": ["admin", "reviewer_lead"],
  "allowed_push_roles": [],
  "bypass_roles": ["admin"],

  "enforcement_level": "strict"
}
```

### Validate Operation

```http
POST /v1/branch-protection/validate
```

**Request Body:**

```json
{
  "operation": "merge",
  "branch_id": "branch_abc123",
  "repo_id": "org/repo",
  "org_id": "org_123"
}
```

**Response:**

```json
{
  "allowed": false,
  "reason": "Merges must go through pull request"
}
```

---

## Branch Policies API

### Create Policy

```http
POST /v1/branch-policies
```

**Example - Naming Convention Policy:**

```json
{
  "org_id": "org_123",
  "policy_name": "Feature Branch Naming",
  "policy_type": "naming",
  "branch_naming_patterns": {
    "feature": "^feature/[A-Z]+-[0-9]+-[a-z-]+$",
    "hotfix": "^hotfix/v[0-9]+\\.[0-9]+\\.[0-9]+$",
    "release": "^release/v[0-9]+\\.[0-9]+$"
  },
  "enforce_naming": true,
  "description": "Enforce JIRA ticket format for feature branches"
}
```

**Example - Workflow Policy:**

```json
{
  "org_id": "org_123",
  "policy_name": "GitFlow Workflow",
  "policy_type": "workflow",
  "require_base_branch": true,
  "allowed_base_branches": ["develop", "main"],
  "auto_delete_on_merge": true,
  "max_branch_age_days": 30,
  "description": "Standard GitFlow workflow"
}
```

**Example - Merge Strategy Policy:**

```json
{
  "org_id": "org_123",
  "policy_name": "Squash Merges Only",
  "policy_type": "merge_strategy",
  "allowed_merge_methods": ["squash"],
  "default_merge_method": "squash",
  "description": "Keep commit history clean with squash merges"
}
```

### Validate Branch Naming

```http
POST /v1/branch-policies/validate-naming
```

**Request Body:**

```json
{
  "org_id": "org_123",
  "repo_id": "org/repo",
  "branch_name": "feature/AUTH-123-login",
  "branch_type": "feature"
}
```

**Response:**

```json
{
  "valid": true,
  "reason": null,
  "violated_policies": null,
  "suggested_format": null
}
```

**Invalid Response:**

```json
{
  "valid": false,
  "reason": "Branch name does not match required pattern",
  "violated_policies": ["Feature Branch Naming"],
  "suggested_format": "feature/TICKET-123-description"
}
```

---

## Webhook Events

The backend processes GitHub webhook events for automatic branch synchronization:

### Supported Events

| Event | Description |
|-------|-------------|
| `create` | Branch or tag creation |
| `delete` | Branch or tag deletion |
| `push` | Push to branch (updates commit metadata) |
| `pull_request` | PR events (syncs source and target branches) |

### Webhook Response

```json
{
  "ok": true,
  "event": "create",
  "duplicate": false,
  "branch_sync": [
    {
      "event": "create",
      "result": {
        "branch_id": "branch_abc123",
        "action": "created",
        "branch_name": "feature/new-feature",
        "success": true,
        "error": null
      }
    }
  ]
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "error_code",
  "message": "Human readable message",
  "violated_policies": ["Policy Name"]  // optional
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `branch_exists` | 409 | Branch already exists |
| `branch_not_found` | 404 | Branch not found |
| `branch_protected` | 403 | Cannot modify protected branch |
| `branch_name_invalid` | 400 | Branch name violates naming policy |
| `workflow_invalid` | 400 | Operation violates workflow policy |
| `operation_not_allowed` | 403 | Protection rule blocks operation |
| `rule_not_found` | 404 | Protection rule not found |
| `policy_exists` | 409 | Policy with name already exists |
| `policy_not_found` | 404 | Policy not found |

---

## Permission Matrix

| Operation | Required Permission |
|-----------|---------------------|
| List branches | `branches.view` |
| Create branch | `branches.create` |
| Update branch | `branches.merge` |
| Delete branch | `branches.delete` |
| Set default | `branches.set_default` |
| View protection rules | `protection.view` |
| Configure protection | `protection.configure` |
| Bypass protection | `protection.bypass` |
| View policies | `policies.view` |
| Create policy | `policies.create` |
| Modify policy | `policies.modify` |
| Delete policy | `policies.delete` |

---

## OpenAPI Specification

The full OpenAPI 3.0 specification is available at:

- **Swagger UI**: `GET /docs`
- **ReDoc**: `GET /redoc`
- **OpenAPI JSON**: `GET /openapi.json`

---

## Rate Limits

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Read operations | 1000 req/min |
| Write operations | 100 req/min |
| Webhook processing | 500 req/min |

---

## Examples

### Complete Flow: Create Feature Branch with Protection

```bash
# 1. Validate branch name first
curl -X POST /v1/branch-policies/validate-naming \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "org_id": "org_123",
    "branch_name": "feature/AUTH-456-oauth",
    "branch_type": "feature"
  }'

# 2. Create the branch
curl -X POST /v1/branches \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "repo_id": "org/repo",
    "org_id": "org_123",
    "branch_name": "feature/AUTH-456-oauth",
    "branch_type": "feature",
    "base_branch": "develop"
  }'

# 3. Check if merge is allowed
curl -X POST /v1/branch-protection/validate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "operation": "merge",
    "branch_id": "branch_xyz",
    "repo_id": "org/repo",
    "org_id": "org_123"
  }'
```
