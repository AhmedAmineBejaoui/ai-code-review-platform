#!/bin/bash
# Database initialization and migration script for microservices

set -e

echo "Starting database migration for microservices..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "PostgreSQL is not ready yet..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Create database if it doesn't exist
createdb -h postgres -U postgres ai_code_review 2>/dev/null || echo "Database already exists"

# Run migrations for each service that needs it
echo "Running migrations..."

# Auth Service migrations
echo "Migrating auth service..."
python -c "
import sys
sys.path.append('/app')
from app.data.models import Base
from sqlalchemy import create_engine
engine = create_engine('postgresql+psycopg://postgres:postgres@postgres:5432/ai_code_review')
Base.metadata.create_all(engine)
print('Auth service tables created')
"

# Analysis Service migrations  
echo "Migrating analysis service..."
python -c "
import sys
sys.path.append('/app')
from app.data.models import Base
from sqlalchemy import create_engine
engine = create_engine('postgresql+psycopg://postgres:postgres@postgres:5432/ai_code_review')
Base.metadata.create_all(engine)
print('Analysis service tables created')
"

# RAG Service migrations
echo "Migrating RAG service..."
python -c "
import sys
sys.path.append('/app')
from app.data.models import Base
from sqlalchemy import create_engine
engine = create_engine('postgresql+psycopg://postgres:postgres@postgres:5432/ai_code_review')
Base.metadata.create_all(engine)
print('RAG service tables created')
"

echo "All migrations completed successfully!"