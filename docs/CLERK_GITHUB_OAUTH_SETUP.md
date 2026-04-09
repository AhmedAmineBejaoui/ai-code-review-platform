# Setting Up GitHub OAuth in Clerk

## Why This Matters

Without GitHub OAuth configured in Clerk:
- ❌ Users can't authorize the app to access their private repos
- ❌ Only public repos are visible
- ❌ Can't fetch org repos or collaborations

**With GitHub OAuth configured**:
- ✅ Users see all their repos (public + private)
- ✅ Works with organization repos
- ✅ Better rate limiting from GitHub
- ✅ Seamless experience in the dashboard

---

## Prerequisites

1. **GitHub Account** - You'll need a GitHub account
2. **GitHub Organization (Optional)** - For testing with org repos
3. **Clerk Account** - Already set up (dashboard is using it)
4. **Admin access** to Clerk dashboard

---

## Step-by-Step Setup

### Step 1: Create GitHub OAuth App

1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps**  
   (URL: https://github.com/settings/developers)

2. Click **"New OAuth App"**

3. Fill in:
   - **Application name**: `CodeReviewPlatform` (or your app name)
   - **Homepage URL**: `http://localhost:3000` (for local) or your production URL
   - **Application description**: `AI-powered code review platform`
   - **Authorization callback URL**: 
     - **Local**: `http://localhost:3000/auth/callback/github`
     - **Production**: `https://yourdomain.com/auth/callback/github`

4. Click **"Register application"**

5. You'll get:
   - **Client ID** (save this)
   - **Client Secret** (click "Generate" and save this)

### Step 2: Configure in Clerk Dashboard

1. Go to **Clerk Dashboard** (https://dashboard.clerk.com)

2. Select your instance/project

3. Go to **Social Connections** (left sidebar)

4. Find **GitHub** and click **"Add Connection"**

5. Enter:
   - **Client ID**: Paste from GitHub OAuth app
   - **Client Secret**: Paste from GitHub OAuth app
   - **Enabled on**: Toggle ON (to enable)

6. Click **"Save"**

7. You'll see a **Redirect URI** provided by Clerk:
   ```
   https://YOUR_CLERK_DOMAIN/auth/callback/github
   ```
   
   Add this to your GitHub OAuth app:
   - Go back to GitHub OAuth app settings
   - Add to **Authorization callback URLs**: 
     (if different from the local/prod URL you set)

### Step 3: Configure Frontend Environment

Ensure your frontend `.env.local` has Clerk keys (already done):

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Step 4: Test It

1. **Start your app**:
   ```bash
   cd apps/dashboard
   npm run dev
   ```

2. **Go to Settings → Connected accounts**

3. Click **"Connect account"** → **GitHub**

4. Authorize the application

5. You should see: ✅ **GitHub • your-github-username**

6. **Open "Start New Analysis" modal**

7. Verify: ✓ Repositories populate automatically!

---

## Troubleshooting

### "Connect GitHub Account" button still shows

**Check**:
1. ✓ GitHub OAuth app created and credentials correct?
   - Verify in GitHub Settings → Developer settings
2. ✓ Credentials added to Clerk dashboard?
   - Go to Clerk → Social Connections → GitHub → Enabled ON?
3. ✓ User actually connected GitHub?
   - Check Settings → Connected accounts
4. ✓ Clear browser cache and reload

**If still not working**:
- Check browser console for errors (F12 → Console)
- Check server logs for stack traces
- See `GITHUB_OAUTH_FIX.md` → "Browser Console & Server Logs" section

### "No repositories found" even after connecting

**This means**:
1. OAuth connection works ✓
2. But GitHub user has no repos

**Solutions**:
- Create a test repo in GitHub
- Use "Manual Entry" mode instead
- Use "Custom GitHub Account" to load org repos

### "Rate limit exceeded" error

**This means** you need to connect GitHub OAuth. Error looks like:
```
API rate limit exceeded. No GitHub OAuth token detected. 
Reconnect GitHub in Clerk to increase the rate limit.
```

**Fix**:
- Make sure GitHub OAuth is configured in Clerk
- User must authorize the app (Settings → Connected accounts → Connect GitHub)

### "Authorization callback URL mismatch"

**Error**: `redirect_uri_mismatch`

**Fix**:
- The callback URL in GitHub OAuth app must match Clerk's redirect URI
- Go to GitHub Settings → Developer settings → Select your app
- Add or update **Authorization callback URLs**
- Should be: `https://YOUR_CLERK_DOMAIN/auth/callback/github`
- Or for local: `http://localhost:3000/auth/callback/github`

---

## URLs Reference

| Service | URL |
|---------|-----|
| GitHub OAuth Apps | https://github.com/settings/developers |
| Clerk Dashboard | https://dashboard.clerk.com |
| Frontend Local | http://localhost:3000 |
| Frontend Dev Setup | `apps/dashboard/.env.local` |

---

## For Production Deployment

### Update Callback URL

**On deployment (e.g., Vercel)**:

1. Update GitHub OAuth app callback URL:
   ```
   https://yourdomain.com/auth/callback/github
   ```

2. Update Clerk instance (if different domain):
   - Clerk → Social Connections → GitHub → Verify callback URL

3. Test flow end-to-end

### Security Notes

- ✅ Never commit `CLERK_SECRET_KEY` to git (use `.env.local`)
- ✅ Never share GitHub Client Secret publicly
- ✅ Use different OAuth apps for dev vs prod
- ✅ Set up prod GitHub OAuth app separately

---

## After Setup Works

Once GitHub OAuth is configured:

1. Users see their repos automatically
2. No more "Connect GitHub" prompts
3. Can analyze private repos
4. Better GitHub API rate limits
5. Organization repos appear in dropdown

✅ **Dashboard is ready to use!**

---

## Questions?

See:
- `GITHUB_OAUTH_ISSUE_FIX.md` - Quick reference of the backend fix
- `docs/README.md` - Platform overview
- GitHub OAuth docs: https://docs.github.com/en/developers/apps/building-oauth-apps
- Clerk docs: https://clerk.com/docs/authentication/social-connections/github
