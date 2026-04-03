# API Endpoints Testing Guide

This guide provides comprehensive testing instructions for all new API endpoints created during the system upgrade.

## Prerequisites

1. **Start the Backend Server**:
   ```bash
   cd apps/backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Ensure Services are Running**:
   - PostgreSQL on `localhost:5432`
   - Redis on `localhost:6379`
   - MinIO on `localhost:9000`
   - Qdrant on `localhost:6333` (optional)

3. **Authentication**:
   - Most endpoints require JWT authentication
   - Use Clerk token or test token from `.env`

---

## PART 1: Object Storage API (MinIO)

**Base Path**: `/api/v1/storage`

### 1. Health Check
```bash
curl -X GET http://localhost:8000/api/v1/storage/health
```
**Expected Response**:
```json
{
  "status": "healthy",
  "bucket": "ai-review-artifacts",
  "accessible": true
}
```

### 2. Upload File
```bash
curl -X POST http://localhost:8000/api/v1/storage/upload \
  -F "file=@/path/to/test-file.txt"
```
**Expected Response**:
```json
{
  "message": "File uploaded successfully",
  "object_name": "20260401_123456_test-file.txt",
  "bucket": "ai-review-artifacts",
  "url": "/api/v1/storage/download/20260401_123456_test-file.txt"
}
```

### 3. List Objects
```bash
curl -X GET http://localhost:8000/api/v1/storage/list
```
**Expected Response**:
```json
{
  "bucket": "ai-review-artifacts",
  "objects": [
    {
      "name": "20260401_123456_test-file.txt",
      "size": 1024,
      "last_modified": "2026-04-01T12:34:56Z"
    }
  ]
}
```

### 4. Generate Presigned URL
```bash
curl -X GET "http://localhost:8000/api/v1/storage/presigned-url/20260401_123456_test-file.txt?expiry=3600"
```
**Expected Response**:
```json
{
  "url": "http://localhost:9000/ai-review-artifacts/...",
  "expires_in": 3600
}
```

### 5. Download File
```bash
curl -X GET http://localhost:8000/api/v1/storage/download/20260401_123456_test-file.txt \
  -o downloaded-file.txt
```

### 6. Delete Object
```bash
curl -X DELETE http://localhost:8000/api/v1/storage/delete/20260401_123456_test-file.txt
```
**Expected Response**:
```json
{
  "message": "Object deleted successfully",
  "object_name": "20260401_123456_test-file.txt"
}
```

---

## PART 2: Integrations API (Slack & Teams)

**Base Path**: `/api/v1/integrations`

### 1. Get All Integration Statuses
```bash
curl -X GET http://localhost:8000/api/v1/integrations/status
```
**Expected Response**:
```json
{
  "slack": {
    "enabled": false,
    "configured": false
  },
  "teams": {
    "enabled": false,
    "configured": false
  },
  "github": {
    "enabled": true,
    "configured": true
  }
}
```

### 2. Get Slack Configuration
```bash
curl -X GET http://localhost:8000/api/v1/integrations/slack/config
```

### 3. Test Slack Integration
```bash
curl -X POST http://localhost:8000/api/v1/integrations/slack/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification from AI Code Review Platform"}'
```

### 4. Get Teams Configuration
```bash
curl -X GET http://localhost:8000/api/v1/integrations/teams/config
```

### 5. Test Teams Integration
```bash
curl -X POST http://localhost:8000/api/v1/integrations/teams/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification from AI Code Review Platform"}'
```

---

## PART 4: Project Roles API

**Base Path**: `/api/v1/projects/{project_id}`

### 1. Get Project Members
```bash
curl -X GET http://localhost:8000/api/v1/projects/proj_123/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected Response**:
```json
{
  "project_id": "proj_123",
  "members": [
    {
      "user_id": "user_456",
      "username": "alice@company.com",
      "role": {
        "id": "role_dev",
        "name": "Developer",
        "code": "developer"
      },
      "assigned_at": "2026-04-01T10:00:00Z"
    }
  ]
}
```

### 2. Assign Role to User
```bash
curl -X POST http://localhost:8000/api/v1/projects/proj_123/roles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_456",
    "role_id": "role_dev",
    "notes": "Assigned to frontend team"
  }'
```

### 3. Get User's Role in Project
```bash
curl -X GET http://localhost:8000/api/v1/projects/proj_123/roles/user_456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get User's Permissions for Project
```bash
curl -X GET http://localhost:8000/api/v1/projects/proj_123/permissions/user_456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Check Specific Permission
```bash
curl -X GET http://localhost:8000/api/v1/projects/proj_123/check-permission/user_456/reviews.approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Remove User's Role from Project
```bash
curl -X DELETE http://localhost:8000/api/v1/projects/proj_123/roles/user_456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Get All Project Roles for User
```bash
curl -X GET http://localhost:8000/api/v1/projects/users/user_456/project-roles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## PART 6: Role Permissions Toggle API

**Base Path**: `/api/v1/roles`

### 1. Get All Roles with Permissions
```bash
curl -X GET http://localhost:8000/api/v1/roles/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected Response**:
```json
{
  "roles": [
    {
      "id": "role_admin",
      "name": "Admin",
      "code": "admin",
      "permissions": [
        {
          "id": "perm_123",
          "code": "reviews.approve",
          "name": "Approve Reviews",
          "enabled": true
        }
      ]
    }
  ]
}
```

### 2. Get Role Permissions
```bash
curl -X GET http://localhost:8000/api/v1/roles/role_admin/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Toggle Permission (Enable/Disable)
```bash
curl -X PATCH http://localhost:8000/api/v1/roles/role_admin/permissions/perm_123/toggle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Enable Permission
```bash
curl -X POST http://localhost:8000/api/v1/roles/role_admin/permissions/perm_123/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Disable Permission
```bash
curl -X POST http://localhost:8000/api/v1/roles/role_admin/permissions/perm_123/disable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## PART 5: User Cascade Delete

**Base Path**: `/v1/admin/users`

### Delete User with Cascade
```bash
curl -X DELETE http://localhost:8000/v1/admin/users/user_456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected Response**:
```json
{
  "message": "User deleted successfully with cascade",
  "user_id": "user_456",
  "deleted_counts": {
    "user_roles": 2,
    "user_project_roles": 3,
    "organization_memberships": 1,
    "notifications": 45,
    "review_assignments": 12,
    "review_comments": 28,
    "change_requests": 5,
    "reviewer_metrics": 1,
    "review_templates": 2,
    "review_sessions": 8
  }
}
```

---

## Python Test Script

Run the automated test suite:

```bash
cd apps/backend
python scripts/test_object_storage_api.py
```

---

## Testing Checklist

### PART 1: Object Storage
- [ ] Health check returns status
- [ ] File upload works
- [ ] List objects returns uploaded files
- [ ] Presigned URL generation works
- [ ] File download retrieves correct content
- [ ] File deletion removes object

### PART 2: Integrations
- [ ] Status endpoint shows all integrations
- [ ] Slack config endpoint returns settings
- [ ] Slack test sends notification (if webhook configured)
- [ ] Teams config endpoint returns settings
- [ ] Teams test sends notification (if webhook configured)

### PART 4: Project Roles
- [ ] Can list project members
- [ ] Can assign role to user for project
- [ ] Can get user's role in project
- [ ] Can get user's permissions for project
- [ ] Can check specific permission
- [ ] Can remove user's role from project
- [ ] Can get all projects for user

### PART 6: Dynamic Permissions
- [ ] Can list all roles with permissions
- [ ] Can get permissions for specific role
- [ ] Can toggle permission enable/disable
- [ ] Can explicitly enable permission
- [ ] Can explicitly disable permission
- [ ] Disabled permissions don't grant access

### PART 5: Cascade Delete
- [ ] User deletion cascades to all related tables
- [ ] Deletion stats are accurate
- [ ] Cannot delete self
- [ ] Audit log created before deletion

---

## Common Issues & Solutions

### Issue: Backend not running
**Solution**: Start backend with `uvicorn app.main:app --reload --port 8000`

### Issue: MinIO connection failed
**Solution**: 
- Check MinIO is running on port 9000
- Verify credentials in `.env`: `admin/password123`
- Ensure bucket `ai-review-artifacts` exists

### Issue: Authentication errors
**Solution**: 
- Set `CLERK_AUTH_ENABLED=false` for local testing
- Or provide valid JWT token in Authorization header

### Issue: Database errors
**Solution**: 
- Run migrations: `alembic upgrade head`
- Check PostgreSQL is running on port 5432
- Verify connection string in `.env`

---

## Next Steps After Testing

1. **Fix any failing tests**: Review error messages and fix issues
2. **Frontend Integration**: Connect frontend components to these APIs
3. **Documentation**: Update API documentation with examples
4. **Security Review**: Ensure proper RBAC enforcement
5. **Performance Testing**: Test with larger payloads and concurrent requests
