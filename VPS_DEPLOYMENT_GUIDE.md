# 🚀 Guide de Déploiement VPS - Design Pattern Analysis System

## Serveur VPS
- **IP**: 135.125.100.150
- **Utilisateur**: root
- **Mot de passe**: DevoraPass2026

---

## 📋 Déploiement Automatique

### Option 1: Script Bash (Recommandé)

```bash
# Sur votre machine locale (Git Bash ou terminal)
chmod +x deploy-to-vps.sh
./deploy-to-vps.sh
```

**Note**: Le script vous demandera le mot de passe SSH plusieurs fois.

---

### Option 2: Déploiement Manuel

#### 1️⃣ Connexion au VPS

```bash
ssh root@135.125.100.150
# Mot de passe: DevoraPass2026
```

#### 2️⃣ Pull des dernières modifications

```bash
cd /root/ai-code-review-platform
git pull origin main
```

#### 3️⃣ Installation des dépendances

```bash
cd apps/backend
poetry install
```

#### 4️⃣ Configuration des variables d'environnement

Éditez le fichier `.env` à la racine du projet:

```bash
cd /root/ai-code-review-platform
nano .env
```

Ajoutez/modifiez ces lignes:

```bash
# ========================================
# Pattern Analysis Configuration
# ========================================
PATTERN_ANALYSIS_ENABLED=true
PATTERN_ANALYSIS_MIN_CONFIDENCE=0.6
PATTERN_ANALYSIS_MIN_OCCURRENCES=3
PATTERN_ANALYSIS_MAX_VIOLATIONS=50
PATTERN_ANALYSIS_TARGET_EXTENSIONS=".js,.ts,.jsx,.tsx,.py"
PATTERN_ANALYSIS_IGNORE_DIRS="node_modules,dist,build,.git,__pycache__,venv"
PATTERN_ANALYSIS_CACHE_ENABLED=true
PATTERN_ANALYSIS_CACHE_TTL_HOURS=24

# ========================================
# Neo4j Configuration (Required)
# ========================================
NEO4J_ENABLED=true
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j
NEO4J_DATABASE=neo4j
NEO4J_MAX_CONNECTION_POOL_SIZE=50

# ========================================
# GitHub Token (Optional - for profile importer)
# ========================================
GITHUB_TOKEN=ghp_your_token_here
```

Sauvegardez avec `Ctrl+O`, `Enter`, puis `Ctrl+X`.

#### 5️⃣ Exécution des migrations

```bash
cd /root/ai-code-review-platform/apps/backend
poetry run alembic upgrade head
```

#### 6️⃣ Initialisation du schéma Neo4j

```bash
cd /root/ai-code-review-platform/apps/backend

poetry run python -c "
from app.integrations.graph_database.neo4j_client import get_neo4j_client
neo4j = get_neo4j_client()
if neo4j.enabled:
    neo4j.init_schema()
    print('✅ Neo4j schema initialized successfully')
else:
    print('⚠️  Neo4j is disabled in settings')
"
```

#### 7️⃣ Redémarrage des services

**Si vous utilisez Docker:**

```bash
cd /root/ai-code-review-platform
docker-compose down
docker-compose up -d --build
```

**Si vous utilisez systemd:**

```bash
sudo systemctl restart ai-code-review-api
sudo systemctl restart ai-code-review-worker
```

#### 8️⃣ Vérification du déploiement

```bash
# Health check
curl http://localhost:8000/health | python3 -m json.tool

# Vérifier les logs
# Pour Docker:
docker logs -f ai-code-review-api

# Pour systemd:
journalctl -u ai-code-review-api -f
```

---

## 🧪 Tests Après Déploiement

### 1. Test de l'API Pattern Analysis

```bash
# Test endpoint statistics
curl http://localhost:8000/api/v1/patterns/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test health check
curl http://localhost:8000/health
```

### 2. Import de votre profil GitHub

```bash
cd /root/ai-code-review-platform/apps/backend

poetry run python scripts/github_profile_importer.py AhmedAmineBejaoui \
  --max-repos 10 \
  --include-forks false
```

### 3. Extraction de patterns manuellement

```bash
poetry run python -c "
from app.core.design_patterns import PatternExtractor

extractor = PatternExtractor()
patterns = extractor.extract_patterns_from_repository(
    repo_path='/path/to/repo',
    repo_name='my-test-repo'
)

print(f'✅ Extracted {len(patterns)} patterns')
for pattern in patterns[:5]:
    print(f'  - {pattern.name} (confidence: {pattern.confidence:.2f})')
"
```

### 4. Test de l'analyse de PR

```bash
curl -X POST http://localhost:8000/v1/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "project_id": "your-project-uuid",
    "diff": "diff --git a/src/routes/user.routes.js...",
    "context": {
      "pr_number": 123,
      "repository_name": "my-repo"
    }
  }'
```

---

## 📊 Requêtes Neo4j

Connectez-vous à Neo4j Browser: `http://135.125.100.150:7474`

```cypher
// 1. Voir tous les patterns extraits
MATCH (p:DesignPattern)
RETURN p.name, p.confidence, p.occurrences
ORDER BY p.confidence DESC
LIMIT 10

// 2. Voir les patterns d'un repository
MATCH (r:Repository {name: "my-ecommerce-app"})-[:EXHIBITS_PATTERN]->(p:DesignPattern)
RETURN p.name, p.confidence, p.occurrences
ORDER BY p.confidence DESC

// 3. Voir les violations les plus fréquentes
MATCH (v:PatternViolation)-[:VIOLATES]->(p:DesignPattern)
RETURN p.name, COUNT(v) AS violations
ORDER BY violations DESC
LIMIT 10

// 4. Voir les violations d'une analyse
MATCH (pr:PullRequest {pr_id: "analysis-uuid"})-[:HAS_VIOLATION]->(v:PatternViolation)
RETURN v.severity, v.title, v.file_path
ORDER BY v.severity

// 5. Statistiques globales
MATCH (p:DesignPattern)
RETURN 
  COUNT(p) AS total_patterns,
  AVG(p.confidence) AS avg_confidence,
  SUM(p.occurrences) AS total_occurrences
```

---

## 🔍 Monitoring et Logs

### Logs Backend API

```bash
# Docker
docker logs -f ai-code-review-api --tail 100

# Systemd
journalctl -u ai-code-review-api -f --lines 100
```

### Logs Worker (Celery)

```bash
# Docker
docker logs -f ai-code-review-worker --tail 100

# Systemd
journalctl -u ai-code-review-worker -f --lines 100
```

### Logs Neo4j

```bash
docker logs -f neo4j --tail 100
```

### Métriques Prometheus

```bash
curl http://localhost:8000/metrics
```

---

## 🐛 Dépannage

### Problème 1: Neo4j connection failed

**Solution:**

```bash
# Vérifier si Neo4j est actif
docker ps | grep neo4j

# Redémarrer Neo4j
docker-compose restart neo4j

# Vérifier les logs
docker logs neo4j --tail 50

# Test de connexion
poetry run python -c "
from neo4j import GraphDatabase
driver = GraphDatabase.driver('bolt://localhost:7687', auth=('neo4j', 'neo4j'))
with driver.session() as session:
    result = session.run('RETURN 1')
    print('✅ Connection OK')
driver.close()
"
```

### Problème 2: Pattern analysis not running

**Solution:**

```bash
# Vérifier les settings
cd /root/ai-code-review-platform/apps/backend
poetry run python -c "
from app.settings import settings
print(f'PATTERN_ANALYSIS_ENABLED: {settings.PATTERN_ANALYSIS_ENABLED}')
print(f'NEO4J_ENABLED: {settings.NEO4J_ENABLED}')
"

# Vérifier les logs du worker
docker logs ai-code-review-worker | grep -i pattern
```

### Problème 3: GitHub profile importer fails

**Solution:**

```bash
# Vérifier le token GitHub
echo $GITHUB_TOKEN

# Tester l'API GitHub
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/users/AhmedAmineBejaoui/repos

# Vérifier les permissions du répertoire de clonage
ls -la /tmp/github_import_*
```

### Problème 4: Module not found errors

**Solution:**

```bash
cd /root/ai-code-review-platform/apps/backend
poetry install --no-cache
poetry run pip list | grep -E "ragas|datasets|langchain"
```

### Problème 5: Database migration errors

**Solution:**

```bash
cd /root/ai-code-review-platform/apps/backend

# Vérifier l'état des migrations
poetry run alembic current

# Vérifier l'historique
poetry run alembic history

# Forcer une migration spécifique
poetry run alembic upgrade head --sql  # Voir le SQL sans l'exécuter
poetry run alembic upgrade head        # Exécuter
```

---

## 📈 Utilisation en Production

### 1. Importer vos repositories existants

```bash
# Via script
poetry run python scripts/github_profile_importer.py AhmedAmineBejaoui \
  --max-repos 20 \
  --filter-languages javascript,typescript,python

# Via API
curl -X POST http://localhost:8000/api/v1/patterns/import-profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "AhmedAmineBejaoui",
    "include_forks": false,
    "filter_languages": ["javascript", "typescript", "python"],
    "max_repos": 20
  }'
```

### 2. Configurer les webhooks GitHub

Dans GitHub → Settings → Webhooks, configurez:
- **Payload URL**: `http://135.125.100.150:8000/webhook/github`
- **Content type**: `application/json`
- **Events**: Pull requests, Push

### 3. Analyser les PRs automatiquement

L'analyse pattern se fait automatiquement quand un webhook PR est reçu.

Vérifiez dans les logs:

```bash
docker logs -f ai-code-review-worker | grep "Pattern analysis"
```

### 4. Visualiser les patterns dans le dashboard

Accédez au dashboard: `http://135.125.100.150:3001/dashboard/patterns`

---

## 🔐 Sécurité

### Recommandations

1. **Changer les mots de passe par défaut:**

```bash
# Neo4j
docker exec -it neo4j cypher-shell
# Puis:
ALTER USER neo4j SET PASSWORD 'NewSecurePassword123!';
```

2. **Configurer un firewall:**

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8000/tcp    # Backend API (temporaire, utilisez reverse proxy)
sudo ufw enable
```

3. **Utiliser un reverse proxy (Nginx):**

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/ai-code-review
```

Configuration Nginx:

```nginx
server {
    listen 80;
    server_name 135.125.100.150;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

4. **SSL/TLS avec Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 📞 Support

En cas de problème:

1. Vérifiez les logs (voir section Monitoring)
2. Consultez la documentation: `docs/DESIGN_PATTERN_ANALYSIS.md`
3. Vérifiez les issues GitHub: https://github.com/AhmedAmineBejaoui/ai-code-review-platform/issues

---

## ✅ Checklist de Déploiement

- [ ] Connexion SSH au VPS réussie
- [ ] Git pull réussi
- [ ] Dependencies installées (poetry install)
- [ ] .env configuré avec pattern analysis settings
- [ ] Neo4j actif et accessible
- [ ] Migrations de base de données exécutées
- [ ] Schéma Neo4j initialisé
- [ ] Services redémarrés (API + Worker)
- [ ] Health check réussi (GET /health)
- [ ] Test API pattern statistics réussi
- [ ] Import GitHub profile testé (optionnel)
- [ ] Webhooks GitHub configurés
- [ ] Logs monitoring configuré
- [ ] Backup configuré (base de données + Neo4j)

---

**Déploiement effectué le**: [Date]
**Version déployée**: commit `67be59a`
**Fonctionnalités ajoutées**: Design Pattern Analysis System (6,700+ lignes)
