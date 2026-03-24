# 🚀 Guide d'Optimisation du Développement

Ce guide décrit les optimisations mises en place pour réduire la consommation de ressources système lors du développement.

## ❌ Problème Résolu

**Avant** : L'ouverture du projet dans VS Code lançait automatiquement :
- 7 terminaux en parallèle
- 12 services Docker (PostgreSQL, Redis, Qdrant, MinIO, Prometheus, Grafana, etc.)
- Tunnels ngrok et Cloudflare
- Serveurs de développement multiples

**Résultat** : PC lent, blocages, plantages potentiels.

## ✅ Solutions Implémentées

### 1. **Lancement Manuel** (Plus d'auto-démarrage)
Les services ne se lancent plus automatiquement à l'ouverture du projet.

### 2. **Modes de Développement Optimisés**

#### **Mode Minimal** (Recommandé)
```bash
# PowerShell (Windows)
.\scripts\start_dev.ps1 minimal

# Bash (Linux/Mac)
./scripts/start_dev.sh minimal

# Ou directement avec Make
make up-minimal
```

**Services lancés** : Seulement PostgreSQL + Redis + Qdrant (3 services au lieu de 12)

**Consommation** : ~200-300 MB RAM au lieu de 1-2 GB

#### **Mode Frontend Seul**
```bash
.\scripts\start_dev.ps1 frontend
```
Lance seulement le serveur de développement Next.js.

#### **Mode Backend Optimisé**
```bash
.\scripts\start_dev.ps1 backend
```
Infrastructure minimale + API FastAPI (pas de monitoring lourd).

#### **Mode Complet** (Si vraiment nécessaire)
```bash
.\scripts\start_dev.ps1 full
```
Stack complète comme avant (consomme beaucoup de ressources).

### 3. **Tâches VS Code Optimisées**

Nouvelles tâches disponibles dans VS Code (Ctrl+Shift+P → "Tasks: Run Task") :

- **"Dev Mode - Minimal"** : Frontend seul
- **"Dev Mode - Backend Only"** : Backend + infra minimale
- **"Dev Mode - Essential"** : Frontend + Backend optimisé

### 4. **Commandes Make Ajoutées**

```bash
# Infrastructure minimale
make up-minimal      # Démarrer DB + Redis + Qdrant
make down-minimal    # Arrêter l'infrastructure minimale

# API en mode host (plus rapide)
make host-api        # Uvicorn avec --reload sur l'hôte
make host-migrate    # Migrations sur l'hôte
make host-worker     # Worker Celery sur l'hôte (Windows compatible)
```

## 🎯 **Workflow Recommandé**

### Pour le développement quotidien :

1. **Ouvrir le projet** (plus d'auto-démarrage)
2. **Lancer l'infra minimale** :
   ```bash
   make up-minimal
   ```
3. **Démarrer ce dont vous avez besoin** :
   ```bash
   # Backend
   make host-migrate && make host-api

   # Frontend (nouveau terminal)
   cd apps/dashboard && npm run dev
   ```

### Pour des tests complets :

```bash
# Stack complète
make up
make migrate
```

## 📊 **Comparaison des Performances**

| Mode | Services Docker | RAM Estimée | CPU | Temps de Démarrage |
|------|-----------------|-------------|-----|-------------------|
| **Minimal** | 3 | ~300 MB | Faible | 15-30s |
| **Optimisé** | 3 + Host API | ~400 MB | Moyen | 30-45s |
| **Complet** | 12 | 1-2 GB | Élevé | 2-3 min |

## 🔧 **Configuration des Ressources Docker**

Si vous devez parfois utiliser le mode complet, limitez les ressources Docker :

**Docker Desktop → Settings → Resources** :
- **Memory** : 4 GB max (au lieu de 8+ GB)
- **CPU** : 2-4 cores max
- **Swap** : 1 GB

## 🚨 **Si Vous Avez Encore des Problèmes**

### Vérifiez les processus en cours :
```bash
# Voir les containers actifs
docker ps

# Voir l'utilisation des ressources
docker stats

# Arrêter tous les containers
docker stop $(docker ps -q)
```

### Services qui peuvent rester actifs :
```bash
# Après développement, gardez seulement l'infrastructure
make down
make up-minimal  # Pour la prochaine session
```

## 🎛️ **Personnalisation**

Vous pouvez créer vos propres configurations en modifiant :
- `infra/local/docker-compose.minimal.yml` (services)
- `.vscode/tasks.json` (tâches VS Code)
- `scripts/start_dev.*` (scripts de démarrage)