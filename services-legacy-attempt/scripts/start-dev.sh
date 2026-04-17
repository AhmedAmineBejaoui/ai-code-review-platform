#!/bin/bash
# Start all microservices in development mode

set -e

echo "Starting AI Code Review Microservices..."

# Start infrastructure first
echo "Starting infrastructure services..."
docker-compose up -d postgres redis qdrant

# Wait for infrastructure to be ready
echo "Waiting for infrastructure to be ready..."
sleep 10

# Run migrations
echo "Running database migrations..."
docker-compose run --rm auth-service python -c "
from app.data.models import Base
from sqlalchemy import create_engine
import os
engine = create_engine(os.getenv('DATABASE_URL'))
Base.metadata.create_all(engine)
print('Database initialized')
"

# Start all services
echo "Starting all microservices..."
docker-compose up -d

echo "All services started!"
echo ""
echo "Services available at:"
echo "  API Gateway:     http://localhost:8000"
echo "  Auth Service:    http://localhost:8001"
echo "  Analysis Service: http://localhost:8002"
echo "  Review Service:  http://localhost:8003"
echo "  RAG Service:     http://localhost:8004"
echo "  Notification:    http://localhost:8005"
echo ""
echo "Infrastructure:"
echo "  PostgreSQL:      localhost:5432"
echo "  Redis:           localhost:6379"
echo "  Qdrant:          http://localhost:6333"