# Déploiement VPS

Cette stack lance l'application complète sur un seul VPS :

- `caddy` pour TLS et reverse proxy
- `dashboard` (Next.js)
- `api` (FastAPI)
- `worker` (Celery)
- `postgres`, `redis`, `qdrant`, `minio`
- `yjs` pour l'édition collaborative

## Préparation

1. Copier `infra/vps/.env.vps.example` vers `infra/vps/.env.vps`.
2. Renseigner au minimum :
   - `APP_DOMAIN`
   - `API_DOMAIN`
   - `YJS_DOMAIN`
   - `POSTGRES_PASSWORD`
   - `MINIO_ROOT_PASSWORD`
   - `GITHUB_WEBHOOK_SECRET`
   - `SECRETS_ENCRYPTION_KEY`
3. Pointer les entrées DNS `APP_DOMAIN`, `API_DOMAIN` et `YJS_DOMAIN` vers l'IP du VPS.

## Lancement

```bash
docker compose --env-file infra/vps/.env.vps -f infra/vps/docker-compose.yml up -d --build
```

## Vérification

```bash
docker compose --env-file infra/vps/.env.vps -f infra/vps/docker-compose.yml ps
docker compose --env-file infra/vps/.env.vps -f infra/vps/docker-compose.yml logs -f caddy api dashboard worker
```

URLs attendues :

- `https://APP_DOMAIN`
- `https://API_DOMAIN/healthz`
- `wss://YJS_DOMAIN`

## Notes

- Le frontend bake les variables `NEXT_PUBLIC_*` au build. Après changement de domaine ou de config Clerk publique, rebuild obligatoire.
- Les migrations Alembic sont appliquées au démarrage du service `api`.
- `Ollama` et `Neo4j` ne sont pas inclus dans cette première stack VPS. Garder leurs features désactivées ou pointer vers des services externes.
