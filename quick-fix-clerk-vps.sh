#!/bin/bash

# =============================================================================
# Quick VPS Update Script - Clerk Fixes
# =============================================================================
# Run this on VPS to apply the latest Clerk configuration fixes
# SSH: ssh root@135.125.100.150

set -e

echo "========================================="
echo "🚀 Applying Clerk Fixes to VPS Dashboard"
echo "========================================="
echo ""

# Navigate to project directory
cd /root/devora-platform || { echo "❌ Project directory not found!"; exit 1; }

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git fetch origin
git reset --hard origin/main

# Copy production environment file
echo "⚙️  Configuring environment..."
cp apps/dashboard/.env.production apps/dashboard/.env.local

# Add VPS-specific values
echo "📝 Adding VPS IP configuration..."
cat >> apps/dashboard/.env.local <<EOL

# VPS-Specific Configuration (auto-generated)
NEXT_PUBLIC_BACKEND_URL=http://135.125.100.150:8000
NEXT_PUBLIC_API_URL=http://135.125.100.150:3001
NEXT_PUBLIC_APP_URL=http://135.125.100.150:3001
NEXT_PUBLIC_Y_WEBSOCKET_URL=ws://135.125.100.150:1234
EOL

# Rebuild dashboard
echo "🔨 Rebuilding dashboard..."
docker compose down dashboard
docker compose build dashboard --no-cache
docker compose up -d dashboard

# Wait for startup
echo "⏳ Waiting for dashboard to start..."
sleep 10

# Check health
echo "🔍 Checking dashboard health..."
if curl -f http://localhost:3001/ > /dev/null 2>&1; then
    echo "✅ Dashboard is running!"
else
    echo "⚠️  Dashboard might still be starting..."
    echo "   Check logs with: docker logs devora-dashboard -f"
fi

echo ""
echo "========================================="
echo "✅ Clerk Fixes Applied!"
echo "========================================="
echo ""
echo "📋 Summary of changes:"
echo "  • Middleware added (PUBLIC MODE support)"
echo "  • Terms of Service page created"
echo "  • Privacy Policy page created"
echo "  • Production environment configured"
echo ""
echo "🌐 Access dashboard at:"
echo "   http://135.125.100.150:3001"
echo ""
echo "📖 For Clerk configuration, see:"
echo "   CLERK_VPS_SETUP.md"
echo ""
echo "🔧 Useful commands:"
echo "   • View logs:    docker logs devora-dashboard -f"
echo "   • Restart:      docker compose restart dashboard"
echo "   • Stop:         docker compose down dashboard"
echo ""
