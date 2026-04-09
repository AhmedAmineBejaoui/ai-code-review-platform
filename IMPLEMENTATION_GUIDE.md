# AI Code Review Dashboard - Implementation Guide

## Architecture Overview

### Frontend (Next.js/React)
- **Pages**: `/dashboard/statistics`, `/dashboard/teams`, `/dashboard/organization`
- **API Proxies**: `/api/dashboard/statistics`, `/api/dashboard/teams`
- **GitHub Integration**: `/api/dashboard/github/organizations`, `/api/dashboard/github/repos`
- **Real-time Components**: Uses React Suspense for loading, error boundaries for safety

### Backend (FastAPI/Python)
- **Core Endpoints**:
  - `GET /api/v1/statistics` - Aggregates code quality, velocity, and team metrics
  - `GET /api/v1/teams` - Lists organizations and their members
  - `GET /api/v1/organization` - Returns primary organization (NEW)
  - `GET /api/v1/repositories` - Lists all repositories with stats
  - `GET /api/v1/github/sync-repos` - Syncs repos from GitHub (NEW)

### Database (PostgreSQL)
- **Key Tables**:
  - `analyses` - Code analysis records
  - `findings` - Security/quality findings from analyses
  - `organizations` - Teams/organizations
  - `organization_memberships` - Team membership with roles
  - `review_assignments` - Review queue and assignments
  - `users` - Platform users
  - `repositories` - Imported GitHub repositories (NEW)

## Current Status

### ✅ Completed
1. Backend statistics API with error handling
2. Backend teams API with database queries
3. Organization endpoint
4. Frontend pages with proper error states and loading indicators
5. GitHub organization API integration
6. Clerk-based member invitations

### 🔧 In Progress
1. Testing backend connectivity
2. Validating API data flow

### 📋 TODO
1. Create sample data generation script for development
2. Document GitHub import flow
3. Add GitHub collaborator sync on import
4. Create project-members linking table
5. Implement flexible role system (per project)
6. Full end-to-end testing

## How Routes/Pages Work

### Statistics Page (`/dashboard/statistics?tab=quality|velocity|team`)
1. Frontend calls `GET /api/dashboard/statistics?timeRange=30d`
2. Dashboard proxy forwards to `GET /api/v1/statistics?time_range=30d`
3. Backend queries `analyses`, `findings`, `users`, `review_assignments` tables
4. Returns aggregated metrics (scores, trends, team performance)
5. Frontend renders three tabs: Quality, Velocity, Team

**Query Parameters**:
- `tab` - Which tab to show (quality, velocity, team) - default: quality
- `timeRange` - Period (7d, 30d, 90d, 1y) - default: 30d

### Teams Page (`/dashboard/teams?team=dev|QA|DevOps`)
1. Frontend calls `GET /api/dashboard/teams`
2. Dashboard proxy forwards to `GET /api/v1/teams`
3. Backend queries organizations and their members
4. Returns team list with member details and metrics
5. Frontend loads from URL param or shows first team
6. Tabs switch between different organizations

**Query Parameters**:
- `team` - Team ID, slug, or name to select by default

### Organization Page (`/dashboard/organization`)
1. Frontend calls GitHub API via `/api/dashboard/github/organizations`
2. Displays GitHub organization details, repos, and members
3. Shows platform organization via `/api/v1/organization` endpoint

## Environment Setup

### Backend (.env.backend)
```
DATABASE_URL=postgresql://user:password@localhost:5432/ai_code_review
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY=your_private_key
# ... other settings
```

### Frontend (.env.local)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Testing the Integration

### 1. Start the services
```bash
# Backend
cd apps/backend
poetry run uvicorn app.main:app --reload

# Frontend (in another terminal)
cd apps/dashboard
npm run dev
```

### 2. Access the dashboard
```
http://localhost:3000/dashboard/statistics
http://localhost:3000/dashboard/teams
http://localhost:3000/dashboard/organization
```

### 3. Check if data appears
- If you see empty states, check backend logs for errors
- If you see "Loading..." forever, check BACKEND_API_URL configuration
- If you see actual data, the integration is working!

### 4. Create sample data for testing
Run the included seed script:
```bash
cd apps/backend
poetry run python scripts/seed_sample_data.py
```

## Debugging 404s

### The "404 issue" explained:
The routes actually work (they're defined), but users see empty pages because:

1. **No database data**: Queries return empty results
   - Solution: Run seed script or import real GitHub data

2. **Backend unreachable**: Dashboard can't reach backend API
   - Check: `BACKEND_API_URL` environment variable
   - Check: Backend service is running on port 8000

3. **Authentication issues**: Clerk tokens not being passed correctly
   - Check: User is logged in
   - Check: Clerk configuration is correct

4. **Schema mismatch**: Frontend expects different API response format
   - Check: API returns correct field names and types
   - Check: Browser DevTools Network tab for actual response

## Data Flow Examples

### Example 1: User views statistics
```
User clicks /dashboard/statistics?tab=quality
↓
Browser loads page.tsx component
↓
useEffect fetches GET /api/dashboard/statistics?timeRange=30d
↓
Dashboard proxy catches request
↓ (requireBackendAuth validates Clerk token)
↓
Proxy forwards to backend at GET /api/v1/statistics?time_range=30d&category=quality
↓
Backend queries database (analyses, findings, users)
↓
Backend returns QualityMetrics {overall_score: 85, findings: {...}}
↓
Proxy returns response to frontend
↓
Frontend state updates (setData(statsData))
↓
Component re-renders with actual data
```

### Example 2: User invites team member
```
User clicks "Invite Member" button
↓
Dialog opens, user enters email and role
↓
Frontend posts to POST /api/dashboard/teams/invite
↓
{team_id, email, role}
↓
Dashboard endpoint calls clerkClient.invitations.createInvitation()
↓ (with publicMetadata: {invited_team_id, invited_role})
↓
Clerk sends invitation email
↓
Invitee receives email, creates account
↓
Webhook/sync handler links them to team
↓
Invitee appears in team members list
```

## Next Steps

1. **Run seed script** to populate sample data
2. **Test statistics page** - should show charts with data
3. **Test teams page** - should list team members
4. **Test organization page** - should show GitHub orgs
5. **Test GitHub import** - import repo auto-creates team members
6. **Test invitations** - Clerk invites should work end-to-end
7. **Implement role system** - Add per-project roles
8. **Add more analytics** - Drill-down capabilities

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Blank dashboard pages | Empty database | Run seed script |
| "Failed to load teams" error | Backend unreachable | Check `BACKEND_API_URL` |
| 401 Unauthorized | Clerk token invalid | Re-authenticate |
| Missing organization data | User not in any org | Create org or join one |
| Invite button does nothing | Clerk not configured | Check `CLERK_SECRET_KEY` |
| GitHub data not loading | GitHub token expired | Re-authorize GitHub |

## References

- Backend Statistics API: `apps/backend/app/api/http/statistics.py`
- Backend Teams API: `apps/backend/app/api/http/teams.py`
- Frontend Statistics Page: `apps/dashboard/app/dashboard/statistics/page.tsx`
- Frontend Teams Page: `apps/dashboard/app/dashboard/teams/page.tsx`
- Dashboard Proxy: `apps/dashboard/lib/backend-admin.ts`
