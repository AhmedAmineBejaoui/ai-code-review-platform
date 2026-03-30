# Documentation Index

Welcome to the AI Code Review Platform documentation. This directory contains all project documentation organized by purpose and audience.

## Quick Navigation

### 🏗️ Architecture
Understand the system design and technical architecture:
- **[System Overview](architecture/overview.md)** - High-level system architecture (TODO)
- **[Backend Layers](architecture/backend-layers.md)** - Backend architecture details (TODO)
- **[Deployment Architecture](architecture/deployment.md)** - Infrastructure and deployment (TODO)
- **[Detailed Architecture](architecture/architecture.md)** - Comprehensive architecture documentation

### 🔧 Operations
Day-to-day operations and maintenance:
- **[Deployment Procedures](operations/deployment.md)** - How to deploy services (TODO)
- **[Monitoring & Observability](operations/monitoring.md)** - Grafana, Prometheus, logging (TODO)
- **[Troubleshooting Guide](operations/troubleshooting.md)** - Common issues and solutions (TODO)

### 📋 Runbooks
Step-by-step operational procedures:
- **[Local Development Setup](runbooks/local-development.md)** - Complete local setup guide (TODO)
- **[LangChain Migration](runbooks/langchain-cutover-runbook.md)** - LangChain cutover procedures
- **[Manual Testing (Windows)](runbooks/manual-test-windows.md)** - Windows-specific testing guide

### 📖 User & Developer Guides
How-to guides for users and developers:
- **[Performance Optimization](guides/OPTIMIZATION_GUIDE.md)** - Performance tuning and optimization
- **[Repository Context](guides/repo-context-manual.md)** - Repository context configuration
- **[Reviewer System](guides/reviewer-system.md)** - Code review workflow and system
- **[Branch Management](guides/branch-management.md)** - Branch strategies and management

### 📊 Reports & Analysis
Project reports and analysis documentation:
- **[Development History](reports/commit-history.md)** - Commit history and development timeline
- **[Folder Reorganization](reports/folder-reorganization-context.md)** - Project structure migration context
- **[Reference Documentation](reports/reference.md)** - Additional reference materials

### 🤝 Decisions
Architecture decisions and rationale:
- **[ADRs (Architecture Decision Records)](decisions/adr/)** - Formal architecture decisions

### 🔌 API Documentation
API reference and integration guides:
- **[API Reference](api/)** - REST API documentation and examples

---

## Documentation Standards

### Writing Guidelines
- **Audience-focused**: Write for the intended reader (developer, operator, user)
- **Actionable**: Include specific steps, commands, and examples
- **Current**: Keep documentation up-to-date with code changes
- **Linked**: Cross-reference related documentation

### File Organization
```
docs/
├── architecture/     # System design and technical architecture
├── operations/       # Day-to-day operations and maintenance
├── runbooks/         # Step-by-step operational procedures
├── guides/           # User and developer how-to guides
├── reports/          # Project reports and analysis
├── decisions/        # Architecture Decision Records (ADRs)
└── api/              # API documentation and reference
```

### Documentation Types

1. **Architecture** - System design, patterns, technical decisions
2. **Operations** - Deployment, monitoring, maintenance procedures
3. **Runbooks** - Step-by-step procedures for specific tasks
4. **Guides** - How-to documentation for users and developers
5. **Reports** - Analysis, metrics, project status documentation
6. **Decisions** - Architecture Decision Records (ADRs)
7. **API** - REST API reference and integration guides

---

## Getting Started

### New Developers
1. Read [System Overview](architecture/overview.md) (TODO)
2. Follow [Local Development Setup](runbooks/local-development.md) (TODO)
3. Review [Reviewer System](guides/reviewer-system.md)
4. Check [API Reference](api/)

### Operators/DevOps
1. Review [Deployment Architecture](architecture/deployment.md) (TODO)
2. Study [Deployment Procedures](operations/deployment.md) (TODO)
3. Set up [Monitoring & Observability](operations/monitoring.md) (TODO)
4. Learn [Troubleshooting Guide](operations/troubleshooting.md) (TODO)

### Contributors
1. Read [COLLABORATION.md](../COLLABORATION.md) in project root
2. Check [Architecture Decision Records](decisions/adr/)
3. Review [Development History](reports/commit-history.md)
4. Follow coding standards in relevant guides

---

## Contributing to Documentation

### When to Update Documentation
- **Code changes**: Update relevant guides and API docs
- **Architecture changes**: Create ADR, update architecture docs
- **Process changes**: Update runbooks and operational docs
- **New features**: Add user guides and examples

### Documentation Workflow
1. **Create/Update**: Write clear, actionable documentation
2. **Review**: Get team review for accuracy and clarity
3. **Link**: Update this index and cross-references
4. **Validate**: Test procedures and examples
5. **Maintain**: Keep documentation current with changes

### Style Guide
- Use **Markdown** for all documentation
- Include **code examples** with syntax highlighting
- Add **command examples** with expected outputs
- Use **clear headings** for navigation
- Include **links** to related documentation
- Add **TODOs** for planned but incomplete documentation

---

## Documentation Status

### ✅ Complete
- Architecture: Detailed architecture document
- Runbooks: LangChain migration, Windows testing
- Guides: Optimization, repo context, reviewer system, branch management
- Reports: Development history, reorganization context

### 🚧 In Progress
- API documentation (basic structure exists)

### 📝 Planned (TODO)
- Architecture: System overview, backend layers, deployment architecture
- Operations: Deployment procedures, monitoring setup, troubleshooting
- Runbooks: Local development setup guide
- More comprehensive API documentation

---

## Need Help?

- **General questions**: Check project README.md
- **Setup issues**: See runbooks/ directory
- **API usage**: Check api/ directory
- **Architecture questions**: Review architecture/ directory
- **Operational issues**: Consult operations/ and runbooks/
- **Code contributions**: Read COLLABORATION.md

---

**Last Updated**: March 2026 | **Maintained by**: The AI Code Review Platform Team