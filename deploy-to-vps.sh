#!/bin/bash

# ============================================================================
# VPS Deployment Script - Design Pattern Analysis System
# Server: 135.125.100.150
# ============================================================================

set -e  # Exit on error

echo "=========================================="
echo "🚀 Deploying to VPS: 135.125.100.150"
echo "=========================================="

VPS_IP="135.125.100.150"
VPS_USER="root"
PROJECT_DIR="/root/ai-code-review-platform"

echo ""
echo "📡 Step 1: Pulling latest changes from GitHub..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/ai-code-review-platform
git pull origin main
echo "✅ Git pull completed"
ENDSSH

echo ""
echo "📦 Step 2: Installing backend dependencies..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/ai-code-review-platform/apps/backend
poetry install
echo "✅ Backend dependencies installed"
ENDSSH

echo ""
echo "🔧 Step 3: Checking environment variables..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/ai-code-review-platform

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Creating .env from example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env created from .env.example"
    else
        echo "❌ ERROR: .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Check pattern analysis settings
echo ""
echo "📋 Current pattern analysis settings:"
grep -E "PATTERN_ANALYSIS|NEO4J" .env || echo "⚠️  Pattern analysis settings not found in .env"
ENDSSH

echo ""
echo "🗄️  Step 4: Running database migrations..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/ai-code-review-platform/apps/backend
poetry run alembic upgrade head
echo "✅ Database migrations completed"
ENDSSH

echo ""
echo "🔄 Step 5: Restarting backend services..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/ai-code-review-platform

# Check if using Docker or systemd
if docker ps | grep -q ai-code-review; then
    echo "🐳 Detected Docker deployment..."
    docker-compose down
    docker-compose up -d --build
    echo "✅ Docker services restarted"
elif systemctl is-active --quiet ai-code-review-api; then
    echo "⚙️  Detected systemd deployment..."
    sudo systemctl restart ai-code-review-api
    sudo systemctl restart ai-code-review-worker
    echo "✅ Systemd services restarted"
else
    echo "⚠️  No deployment method detected (Docker or systemd)"
    echo "Please restart services manually"
fi
ENDSSH

echo ""
echo "🔍 Step 6: Verifying Neo4j connection..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/ai-code-review-platform/apps/backend

# Test Neo4j connection
poetry run python -c "
from app.integrations.graph_database.neo4j_client import get_neo4j_client
try:
    neo4j = get_neo4j_client()
    if neo4j.enabled:
        # Test connection
        with neo4j.driver.session() as session:
            result = session.run('RETURN 1 as test')
            print('✅ Neo4j connection successful')
    else:
        print('⚠️  Neo4j is disabled in settings')
except Exception as e:
    print(f'❌ Neo4j connection failed: {e}')
" || echo "⚠️  Could not verify Neo4j connection"
ENDSSH

echo ""
echo "📊 Step 7: Initializing Neo4j schema..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/ai-code-review-platform/apps/backend

# Initialize Neo4j schema (constraints, indexes, vector indexes)
poetry run python -c "
from app.integrations.graph_database.neo4j_client import get_neo4j_client
try:
    neo4j = get_neo4j_client()
    if neo4j.enabled:
        neo4j.init_schema()
        print('✅ Neo4j schema initialized')
    else:
        print('⚠️  Neo4j is disabled - skipping schema initialization')
except Exception as e:
    print(f'❌ Schema initialization failed: {e}')
" || echo "⚠️  Could not initialize Neo4j schema"
ENDSSH

echo ""
echo "🏥 Step 8: Checking service health..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
cd /root/ai-code-review-platform

# Health check
curl -s http://localhost:8000/health | python3 -m json.tool || echo "⚠️  Backend health check failed"
ENDSSH

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo "1. Configure pattern analysis settings in .env:"
echo "   - PATTERN_ANALYSIS_ENABLED=true"
echo "   - NEO4J_ENABLED=true"
echo "   - NEO4J_URI=bolt://localhost:7687"
echo ""
echo "2. Test pattern extraction:"
echo "   ssh ${VPS_USER}@${VPS_IP}"
echo "   cd /root/ai-code-review-platform/apps/backend"
echo "   poetry run python scripts/github_profile_importer.py YOUR_GITHUB_USERNAME"
echo ""
echo "3. Test API endpoint:"
echo "   curl http://135.125.100.150:8000/api/v1/patterns/statistics"
echo ""
echo "4. View logs:"
echo "   ssh ${VPS_USER}@${VPS_IP}"
echo "   journalctl -u ai-code-review-api -f"
echo "   # OR"
echo "   docker logs -f ai-code-review-api"
echo ""
echo "=========================================="
