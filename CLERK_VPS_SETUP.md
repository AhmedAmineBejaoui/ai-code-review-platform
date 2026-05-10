# Clerk Configuration for VPS Deployment

## Quick Start Options

### Option 1: Disable Clerk (Recommended for Testing)

**Simplest option** - The dashboard will run in PUBLIC MODE without authentication.

In your `.env.production` file on the VPS:
```bash
# Leave Clerk keys empty
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

**Pros:**
- No Clerk account needed
- Works immediately
- Perfect for testing and demos

**Cons:**
- No authentication
- Anyone can access the dashboard

---

### Option 2: Use Clerk Production Keys (Recommended for Production)

**Full authentication** - Secure multi-user platform.

#### Step 1: Create Clerk Account
1. Go to https://dashboard.clerk.com
2. Sign up for free account
3. Create a new application

#### Step 2: Get Production Keys
1. In Clerk Dashboard → **API Keys**
2. Switch to **Production** tab (important!)
3. Copy your keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)

#### Step 3: Configure Allowed Origins
1. In Clerk Dashboard → **Domains**
2. Add your VPS domain/IP:
   ```
   http://135.125.100.150:3001
   ```
3. Click **Save**

#### Step 4: Update Environment Variables

On your VPS, edit `.env.production`:
```bash
# Production Clerk Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_live_YOUR_SECRET_HERE

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

#### Step 5: Rebuild Dashboard
```bash
cd /root/devora-platform
docker compose down dashboard
docker compose up -d --build dashboard
```

---

## Troubleshooting

### Error: "Clerk has been loaded with development keys"
**Solution:** You're using test keys (`pk_test_*` / `sk_test_*`) instead of production keys (`pk_live_*` / `sk_live_*`).
- Go to Clerk Dashboard → API Keys → Switch to **Production** tab

### Error: "Suffixed cookie failed"
**Solution:** This happens with HTTP (non-HTTPS) connections.
- The middleware is already configured to handle this
- If using Clerk, consider setting up HTTPS with nginx + Let's Encrypt (see below)

### Error: "Could not establish connection. Receiving end does not exist"
**Solution:** This is from the QuillBot browser extension, not your app.
- Ignore this error (harmless)
- Or disable QuillBot extension when testing

### Error: "404 on /terms or /privacy"
**Solution:** Already fixed - pages have been created at:
- `apps/dashboard/app/(dashboard)/terms/page.tsx`
- `apps/dashboard/app/(dashboard)/privacy/page.tsx`

---

## Production HTTPS Setup (Optional but Recommended)

For production with real users, set up HTTPS:

### 1. Install nginx and Certbot
```bash
apt update
apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configure nginx
Create `/etc/nginx/sites-available/devora`:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 3. Enable site and get SSL certificate
```bash
ln -s /etc/nginx/sites-available/devora /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
certbot --nginx -d your-domain.com
```

### 4. Update Clerk Allowed Origins
In Clerk Dashboard → Domains, add:
```
https://your-domain.com
```

### 5. Update Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_BACKEND_URL=https://your-domain.com/api
```

---

## Current VPS Status

**VPS IP:** 135.125.100.150  
**Dashboard URL:** http://135.125.100.150:3001  
**Backend URL:** http://135.125.100.150:8000  

**Clerk Mode:** Currently set to PUBLIC MODE (no authentication)  
**To enable Clerk:** Follow Option 2 above  

---

## Environment File Locations

- **Development:** `apps/dashboard/.env.local`
- **Docker:** `apps/dashboard/.env.docker`
- **Production VPS:** `apps/dashboard/.env.production`

**Note:** The `.env.production` file should be on the VPS at:
```
/root/devora-platform/apps/dashboard/.env.production
```

---

## Quick Commands

### Check current Clerk configuration
```bash
cd /root/devora-platform/apps/dashboard
grep CLERK .env.production
```

### View dashboard logs
```bash
docker logs devora-dashboard -f
```

### Rebuild dashboard after config changes
```bash
cd /root/devora-platform
docker compose down dashboard
docker compose up -d --build dashboard
```

### Test dashboard without Docker
```bash
cd /root/devora-platform/apps/dashboard
npm install
npm run build
npm start
```

---

## Support

For Clerk-specific issues:
- **Documentation:** https://clerk.com/docs
- **Support:** https://clerk.com/support

For Devora issues:
- **GitHub:** https://github.com/ai-code-review-2026/backend
- **Email:** bejaouiahmed053@gmail.com
