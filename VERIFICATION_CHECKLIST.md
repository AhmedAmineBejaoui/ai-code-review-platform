# AI Code Review Dashboard - Verification Checklist

Use this checklist to verify all implementations are working correctly.

## Pre-Flight Checks

### Environment Setup
- [ ] Backend environment configured (`.env.backend` exists)
- [ ] Frontend environment configured (`.env.local` exists)
- [ ] `BACKEND_API_URL` set to `http://localhost:8000`
- [ ] Clerk keys configured in frontend `.env.local`
- [ ] Database connection string valid

### Dependencies
- [ ] Python 3.9+ installed (backend)
- [ ] Node.js 18+ installed (frontend)
- [ ] PostgreSQL 12+ running and accessible
- [ ] Poetry installed (backend)
- [ ] npm or yarn installed (frontend)

### Database
- [ ] Alembic migrations completed: `alembic upgrade head`
- [ ] Tables exist: `organizations`, `users`, `analyses`, `findings`
- [ ] User can access database with `psql` or similar

## Backend Setup & Testing

### 1. Backend Dependencies
```bash
cd apps/backend
poetry install
```
- [ ] All dependencies installed without errors
- [ ] No version conflicts reported
- [ ] Virtual environment created

### 2. Backend Migrations
```bash
alembic upgrade head
```
- [ ] All migrations applied successfully
- [ ] No SQL errors in migration output
- [ ] Database schema matches expected tables

### 3. Seed Sample Data
```bash
poetry run python scripts/seed_sample_data.py
```
- [ ] Script runs without errors
- [ ] Output shows: "✓ Created 3 organizations"
- [ ] Output shows: "✓ Created 6 users"
- [ ] Output shows: "✓ Created 20 analyses"
- [ ] Output shows: "✓ Created 15 review assignments"

### 4. Start Backend Server
```bash
poetry run uvicorn app.main:app --reload
```
- [ ] Server starts with "Uvicorn running on http://127.0.0.1:8000"
- [ ] No import errors or exceptions
- [ ] Health check endpoint works: `curl http://localhost:8000/healthz`
- [ ] Output includes route registration logs

### 5. Backend API Verification
Test endpoints directly:

**Statistics Endpoint**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-User-Id: test-user" \
     http://localhost:8000/api/v1/statistics?time_range=30d
```
- [ ] Returns 200 OK
- [ ] Response includes: `quality`, `velocity`, `team` objects
- [ ] Fields present: `overall_score`, `security_score`, `total_findings`
- [ ] Trends array is populated (if data exists)

**Teams Endpoint**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-User-Id: test-user" \
     http://localhost:8000/api/v1/teams
```
- [ ] Returns 200 OK
- [ ] Response includes: `items` array with teams
- [ ] Each team has: `id`, `name`, `member_count`, `members` array
- [ ] Members have: `user_id`, `email`, `role`

**Organization Endpoint**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-User-Id: test-user" \
     http://localhost:8000/api/v1/organization
```
- [ ] Returns 200 OK
- [ ] Response includes: organization metadata
- [ ] Has: `repos_count`, `members_count`, `teams_count`

## Frontend Setup & Testing

### 1. Frontend Dependencies
```bash
cd apps/dashboard
npm install
# or
yarn install
```
- [ ] All dependencies installed
- [ ] No peer dependency warnings
- [ ] node_modules created

### 2. Start Frontend Dev Server
```bash
npm run dev
```
- [ ] Server starts with "ready - started server on 0.0.0.0:3000"
- [ ] No build errors
- [ ] Nextjs page compilation shows ✅

### 3. Access Dashboard
Open browser to `http://localhost:3000`
- [ ] Dashboard loads
- [ ] Sign-in page appears (if not logged in)
- [ ] After login, dashboard layout visible
- [ ] Navigation sidebar present
- [ ] User profile info shown

### 4. Statistics Page (`/dashboard/statistics`)
Navigate to `http://localhost:3000/dashboard/statistics`
- [ ] Page loads without 404 error ✅
- [ ] "Chargement des statistiques..." appears briefly
- [ ] Quality tab selected by default
- [ ] Statistics data displays (or proper empty state)
- [ ] Three tabs visible: Quality, Vitesse, Equipe
- [ ] Time range selector works (7d, 30d, 90d, 1y)
- [ ] Refresh button functional
- [ ] Try query params: `?tab=velocity` and `?tab=team`

**With sample data**:
- [ ] Quality tab shows: score cards, trends chart
- [ ] Velocity tab shows: review velocity metrics
- [ ] Team tab shows: team members, contributors

**Without data**:
- [ ] Shows appropriate empty states
- [ ] No error messages
- [ ] Loading spinner visible initially

### 5. Statistics Page Query Parameters
- [ ] `/dashboard/statistics?tab=quality` ✅ works
- [ ] `/dashboard/statistics?tab=velocity` ✅ works
- [ ] `/dashboard/statistics?tab=team` ✅ works
- [ ] Tab parameter updates active tab
- [ ] Other params preserved on navigation

### 6. Teams Page (`/dashboard/teams`)
Navigate to `http://localhost:3000/dashboard/teams`
- [ ] Page loads without 404 error ✅
- [ ] "Loading teams..." appears briefly
- [ ] Teams list displayed
- [ ] Team members section shows people
- [ ] Action buttons visible:
  - [ ] "Team Settings" button
  - [ ] "Invite Member" button

**Team Query Parameter**:
- [ ] `/dashboard/teams?team=TEAM_ID` works ✅
- [ ] Specified team selected by default
- [ ] Team data updates correctly

**Team Settings**:
- [ ] Click "Team Settings" button
- [ ] Dialog opens with team info
- [ ] Can edit name and description
- [ ] Save button works
- [ ] Changes persist

**Invite Member**:
- [ ] Click "Invite Member" button
- [ ] Dialog opens with email field
- [ ] Can enter email and select role
- [ ] Send button functional
- [ ] Success message appears

### 7. Organization Page (`/dashboard/organization`)
Navigate to `http://localhost:3000/dashboard/organization`
- [ ] Page loads without 404 error ✅
- [ ] GitHub organization data loads
- [ ] Shows organization selector (if multiple orgs)
- [ ] Organization name and avatar displayed
- [ ] Repositories section visible:
  - [ ] Repo names listed
  - [ ] Descriptions visible
  - [ ] Language badges shown
  - [ ] Star/fork counts displayed
- [ ] Members section visible:
  - [ ] Member avatars shown
  - [ ] Member names listed
  - [ ] Roles indicated if applicable

**If not authenticated with GitHub**:
- [ ] Shows "GitHub not connected" message
- [ ] No error in console
- [ ] Graceful handling

### 8. API Proxy Verification
Check browser DevTools Network tab:
- [ ] `/api/dashboard/statistics` requests succeed (200)
- [ ] `/api/dashboard/teams` requests succeed (200)
- [ ] Response payloads contain expected data
- [ ] No CORS errors
- [ ] No 401/403 authentication errors

### 9. Error Handling
Try to break things gracefully:
- [ ] Disconnect backend → Shows error with retry
- [ ] Empty database → Shows empty states, no errors
- [ ] Invalid query params → Handled gracefully
- [ ] Browser console shows no errors
- [ ] Network tab shows failed requests only when backend down

## Integration Tests

### End-to-End Flow
1. **Data Flow Test**
   - [ ] Seed script creates data
   - [ ] Backend queries return data
   - [ ] Frontend displays data
   - [ ] Entire chain works

2. **Invite Member Test**
   - [ ] Click invite button on teams page
   - [ ] Enter valid email
   - [ ] Submit invitation
   - [ ] Clerk integration works (check logs)
   - [ ] No errors thrown

3. **GitHub Integration Test**
   - [ ] User logged in with GitHub
   - [ ] Organization page shows GitHub data
   - [ ] Repos and members display
   - [ ] Can see public profile data

4. **Query Parameter Test**
   - [ ] Statistics tab param works
   - [ ] Teams team param works
   - [ ] Multiple params together work
   - [ ] Page refreshes maintain state

## Performance Checks

### Load Time
- [ ] Statistics page loads in < 2 seconds ✅
- [ ] Teams page loads in < 2 seconds ✅
- [ ] Organization page loads in < 3 seconds ✅
- [ ] No significant delays on interaction

### Database Performance
- [ ] Seed script completes in < 30 seconds
- [ ] API responses return in < 1 second
- [ ] No timeout errors in logs
- [ ] No database connection pool issues

## Security Checks

### Authentication
- [ ] Unauthenticated users redirected to login
- [ ] Clerk tokens validated on backend
- [ ] API requires Authorization header
- [ ] Invalid tokens rejected with 401

### Data Protection
- [ ] Sensitive data not logged
- [ ] Passwords not visible anywhere
- [ ] SQL injection attempts blocked
- [ ] CORS properly configured

## Browser Compatibility
Test in multiple browsers:
- [ ] Chrome/Chromium ✅
- [ ] Firefox ✅
- [ ] Safari (if available) ✅
- [ ] Edge (if available) ✅

## Documentation Verification
- [ ] `IMPLEMENTATION_GUIDE.md` exists and is readable
- [ ] `DASHBOARD_IMPLEMENTATION_SUMMARY.md` exists and is readable
- [ ] `VERIFICATION_CHECKLIST.md` is this document
- [ ] Quick-start section in `README.md` updated
- [ ] All code comments are helpful
- [ ] API documentation is accurate

## Troubleshooting Checklist

### If Statistics Page Shows Empty
- [ ] Backend running on port 8000?
- [ ] `BACKEND_API_URL` set correctly?
- [ ] Seed script ran successfully?
- [ ] Database has analyses table?
- [ ] Check backend logs for errors

### If Teams Page Shows Error
- [ ] Organizations table populated?
- [ ] organization_memberships table has data?
- [ ] Check backend logs for SQL errors
- [ ] Verify database connection

### If Organization Page Shows "Not Connected"
- [ ] User authenticated with GitHub?
- [ ] GitHub OAuth properly configured?
- [ ] Clerk tokens valid?
- [ ] Check browser console for API errors

### If Pages Return 404
- [ ] Routes exist in `apps/dashboard/app/dashboard/`?
- [ ] Next.js app rebuilt?
- [ ] Frontend dev server restarted?
- [ ] Check for route file naming issues

## Final Verification

### All Systems Go? ✅
- [ ] Backend running and responding
- [ ] Frontend running without errors
- [ ] Sample data seeded successfully
- [ ] Statistics page displays data
- [ ] Teams page displays members
- [ ] Organization page shows GitHub info
- [ ] API calls show in DevTools
- [ ] No console errors
- [ ] All query params work
- [ ] Invite flow functional
- [ ] Documentation complete

### Ready for Production? ✅
- [ ] All tests passed above
- [ ] No breaking errors in logs
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Database backups configured
- [ ] Monitoring/alerts set up
- [ ] Team trained on system
- [ ] Runbook created

## Sign-Off

**Verification Date**: ________________
**Verified By**: ________________
**Status**: [ ] All Checks Passed [ ] Issues Found (see notes)

**Notes**:
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

For detailed help, see:
- Troubleshooting: `IMPLEMENTATION_GUIDE.md` → Common Issues
- Architecture: `DASHBOARD_IMPLEMENTATION_SUMMARY.md` → Architecture Decisions
- Quick Start: `README.md` → Quick Start section
