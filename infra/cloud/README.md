# Cloud Deployment Index

This repository supports multiple cloud deployment options.

## Recommended (0$ strict)

- [Oracle Always Free + Vercel + Supabase + Upstash + DuckDNS](./oracle/README.md)

Why this is the default:
- Keeps frontend on Vercel Hobby (free)
- Runs API + Celery worker 24/7 on an Always Free VM
- Preserves HTTPS on backend with no paid add-ons

## Legacy option

- [Fly.io deployment guide](./fly/README.md)

Use the Fly.io path only if you intentionally accept non-zero cost risk depending on current Fly pricing/account eligibility.
