# AI Code Review Platform - Microservices Architecture

🎉 **Migration vers microservices terminée!** 

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Dashboard     │────┤   API Gateway    │
│   (Next.js)     │    │   Port 8000      │
│   Port 3001     │    └──────────────────┤
└─────────────────┘                       │
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │                                             │
         ┌─────────▼──────────┐                        ┌────────▼─────────┐
         │  Auth Service      │                        │ Analysis Service │
         │  Port 8001         │                        │ Port 8002        │
         │ • JWT validation   │                        │ • PR analysis    │
         │ • RBAC             │                        │ • GitHub webhook │
         └────────────────────┘                        └──────────────────┘
                   │                                             │
         ┌─────────▼──────────┐                        ┌────────▼─────────┐
         │  Review Service    │                        │  Worker Service  │
         │  Port 8003         │                        │ • Celery tasks   │
         │ • LLM reviews      │                        │ • Pipeline       │
         │ • Scoring          │                        │ • Static analysis│
         └────────────────────┘                        └──────────────────┘
                   │                                             │
         ┌─────────▼──────────┐                        ┌────────▼─────────┐
         │  RAG Service       │                        │Notification Svc  │
         │  Port 8004         │                        │ Port 8005        │
         │ • Knowledge base   │                        │ • Webhooks       │
         │ • Vector search    │                        │ • Slack/Email    │
         └────────────────────┘                        └──────────────────┘
```

## 🚀 Démarrage Rapide

### 1. Configuration
```bash
# Copier et configurer l'environnement
cp services/.env.example .env
# Éditer .env avec vos clés Clerk, OpenAI, etc.
```

### 2. Démarrer les microservices
```bash
# Démarrer tous les services
make micro-up

# Vérifier la santé
make micro-validate

# Voir les logs
make micro-logs
```

### 3. Démarrer le dashboard  
```bash
cd apps/dashboard
npm run dev
```

## 📋 Services Disponibles

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8000 | Point d'entrée central |
| Auth Service | 8001 | Authentication Clerk/JWT |
| Analysis Service | 8002 | Analyses + webhook GitHub |
| Review Service | 8003 | LLM reviews (GPT/Ollama) |
| RAG Service | 8004 | Knowledge base + Qdrant |
| Notification | 8005 | Webhooks + notifications |
| Dashboard | 3001 | Interface utilisateur |

## 🔧 Commandes Utiles

```bash
# Microservices
make micro-build    # Build images
make micro-up       # Start all services  
make micro-down     # Stop all services
make micro-logs     # View logs
make micro-validate # Health check

# Development
make micro-migrate  # Run DB migrations
```

## 🔄 Changements par Rapport au Monolithe

### ✅ Avantages
- **Isolation**: Chaque service est indépendant
- **Scalabilité**: Scale individuellement par service
- **Déploiement**: Deploy un service sans affecter les autres
- **Technologie**: Chaque service peut évoluer indépendamment

### 🔄 Flux PR Analysis (Nouveau)
1. **Dashboard** → envoie requête → **API Gateway**
2. **API Gateway** → authentifie via → **Auth Service** 
3. **API Gateway** → route vers → **Analysis Service**
4. **Analysis Service** → enqueue job → **Worker Service** (Celery)
5. **Worker Service** → demande review → **Review Service** (LLM)
6. **Worker Service** → cherche contexte → **RAG Service** (Vector DB)
7. **Worker Service** → envoie notifications → **Notification Service**

## 🏃‍♂️ Test Complet

```bash
# 1. Démarrer microservices
make micro-up

# 2. Vérifier santé
make micro-validate

# 3. Tester intégration dashboard
bash services/scripts/test-dashboard-integration.sh

# 4. Démarrer dashboard
cd apps/dashboard && npm run dev

# 5. Aller sur http://localhost:3001 et créer une analyse PR
```

## 📁 Structure

```
services/
├── api-gateway/         # Point d'entrée (FastAPI)
├── auth-service/        # Auth Clerk/JWT
├── analysis-service/    # PR analysis + GitHub webhooks
├── worker-service/      # Pipeline Celery complet  
├── review-service/      # LLM reviews (GPT/Ollama)
├── rag-service/        # Knowledge base + Qdrant
├── notification-service/ # Notifications + webhooks
├── shared/             # Utilitaires partagés
├── docker-compose.yml  # Orchestration
└── scripts/            # Déploiement + validation
```

## ❗ Migration Notes

- **Database**: Partagée entre services (PostgreSQL)
- **Queue**: Redis pour Celery
- **Vector Store**: Qdrant pour RAG
- **Auth**: Clerk JWT validé par Auth Service
- **Frontend**: Dashboard Next.js inchangé, pointe vers API Gateway

---

🎯 **Le système est production-ready et préserve toutes les fonctionnalités existantes!**