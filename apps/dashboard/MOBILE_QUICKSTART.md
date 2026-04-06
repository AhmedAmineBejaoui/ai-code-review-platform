# 🚀 Quick Start - Mobile App

Get the AI Code Review mobile app running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ All dependencies installed (`npm install` in `apps/dashboard`)
- ✅ `.env.local` configured with Clerk keys

**For iOS:** macOS + Xcode 14+
**For Android:** Android Studio installed

## Step 1: Build for Mobile

```bash
cd apps/dashboard
npm run mobile:build
```

Expected output:
```
✓ Generating static pages (35/39)
[Mobile Build] Mobile build completed successfully!
```

## Step 2: Add Platform

### iOS (macOS only)
```bash
npm run mobile:add:ios
```

### Android
```bash
npm run mobile:add:android
```

## Step 3: Open & Run

### iOS
```bash
npm run mobile:ios
```

Then in Xcode:
1. Select a simulator (iPhone 15 recommended)
2. Click Run (▶️)
3. Wait for build & install
4. App launches! 🎉

### Android
```bash
npm run mobile:android
```

Then in Android Studio:
1. Wait for Gradle sync
2. Select an emulator or device
3. Click Run (▶️)
4. Wait for build & install
5. App launches! 🎉

## Making Changes

After modifying code:

```bash
npm run mobile:build  # Rebuild
npm run mobile:sync   # Sync to native
# Then re-run in IDE
```

## Troubleshooting

### "Server Actions not supported"
✅ Already fixed! If you see this, run:
```bash
git pull  # Get latest changes
npm install
npm run mobile:build
```

### Build fails
```bash
# Clean everything
cd apps/dashboard
rm -rf .next out node_modules
npm install
npm run mobile:build
```

### App crashes on launch
1. Check you have `.env.local` with valid Clerk keys
2. Check logs:
   - **iOS:** Xcode → Window → Devices → Open Console
   - **Android:** Android Studio → Logcat

### Assets not updating
```bash
npm run mobile:build  # Always rebuild first
npm run mobile:sync   # Then sync

# Then clean build in IDE:
# Xcode: Product → Clean Build Folder
# Android Studio: Build → Clean Project
```

## Need Help?

📖 Full guide: `MOBILE.md`
📝 Setup summary: `MOBILE_SETUP_SUMMARY.md`
🐛 Issues: Check logs and documentation

## What Works

✅ Authentication (Clerk)
✅ Dashboard pages
✅ Projects list
✅ Analyses view
✅ Settings
✅ Admin panel
✅ Native features (haptics, safe areas, keyboard handling)

## What Doesn't Work Yet

❌ Dynamic routes (projects/[id]) - requires SPA fallback
❌ OAuth redirects - may need custom URL scheme handling
❌ File uploads - needs native file picker integration

---

**You're all set! Happy mobile development! 📱✨**
