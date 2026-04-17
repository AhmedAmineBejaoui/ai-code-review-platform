"""
Repository layer for Auth Service database operations.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.engine import Engine

from .models import (
    Organization,
    OrganizationMembership,
    Team,
    TeamMember,
    TeamRole,
    TeamWithStats,
    User,
    UserTeamAccess,
)


class UsersRepo:
    """Repository for user operations."""
    
    def __init__(self, engine: Engine):
        self.engine = engine
    
    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID with roles and permissions."""
        with self.engine.connect() as conn:
            row = conn.execute(
                text("""
                    SELECT id, email, display_name, role, is_active, avatar_url,
                           created_at, updated_at
                    FROM users
                    WHERE id = :user_id
                """),
                {"user_id": user_id}
            ).mappings().first()
            
            if not row:
                return None
            
            # Get organization memberships
            memberships = conn.execute(
                text("""
                    SELECT om.id, om.organization_id, om.user_id, om.role, om.status,
                           o.name as organization_name, om.created_at
                    FROM organization_memberships om
                    JOIN organizations o ON o.id = om.organization_id
                    WHERE om.user_id = :user_id AND om.status = 'active'
                """),
                {"user_id": user_id}
            ).mappings().all()
            
            org_memberships = [
                OrganizationMembership(
                    id=m["id"],
                    organization_id=m["organization_id"],
                    user_id=m["user_id"],
                    role=m["role"],
                    status=m["status"],
                    organization_name=m["organization_name"],
                    created_at=m["created_at"],
                )
                for m in memberships
            ]
            
            # Determine roles and permissions
            role = row["role"] or "developer"
            roles = [role]
            permissions = self._permissions_for_roles(roles)
            
            return User(
                id=row["id"],
                email=row["email"],
                display_name=row["display_name"],
                role=role,
                is_active=row["is_active"],
                avatar_url=row["avatar_url"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                roles=roles,
                permissions=permissions,
                organization_memberships=org_memberships,
            )
    
    def upsert_user(
        self,
        user_id: str,
        email: str,
        display_name: Optional[str] = None,
        role: str = "developer",
    ) -> User:
        """Create or update a user."""
        now = datetime.now(timezone.utc)
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO users (id, email, display_name, role, is_active, created_at, updated_at)
                    VALUES (:id, :email, :display_name, :role, TRUE, :now, :now)
                    ON CONFLICT (id) DO UPDATE SET
                        email = COALESCE(EXCLUDED.email, users.email),
                        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                        role = COALESCE(EXCLUDED.role, users.role),
                        updated_at = :now
                """),
                {
                    "id": user_id,
                    "email": email,
                    "display_name": display_name,
                    "role": role,
                    "now": now,
                }
            )
        
        return self.get_user(user_id)
    
    def _permissions_for_roles(self, roles: List[str]) -> List[str]:
        """Get permissions for a set of roles."""
        role_permissions = {
            "developer": {"analyses.read", "analyses.create"},
            "reviewer": {"analyses.read", "analyses.write"},
            "admin": {"analyses.create", "analyses.read", "analyses.write"},
        }
        
        permissions = set()
        for role in roles:
            permissions.update(role_permissions.get(role, role_permissions["developer"]))
        return sorted(permissions)


class OrganizationsRepo:
    """Repository for organization operations."""
    
    def __init__(self, engine: Engine):
        self.engine = engine
    
    def create_organization(
        self,
        org_id: str,
        name: str,
        slug: Optional[str] = None,
    ) -> Organization:
        """Create a new organization."""
        now = datetime.now(timezone.utc)
        
        with self.engine.begin() as conn:
            # Check if exists
            existing = conn.execute(
                text("SELECT id FROM organizations WHERE id = :org_id"),
                {"org_id": org_id}
            ).first()
            
            if existing:
                return self.get_organization(org_id)
            
            conn.execute(
                text("""
                    INSERT INTO organizations (id, name, slug, created_at, updated_at)
                    VALUES (:id, :name, :slug, :now, :now)
                """),
                {
                    "id": org_id,
                    "name": name,
                    "slug": slug or name.lower().replace(" ", "-"),
                    "now": now,
                }
            )
        
        return Organization(
            id=org_id,
            name=name,
            slug=slug,
            created_at=now,
            updated_at=now,
        )
    
    def get_organization(self, org_id: str) -> Optional[Organization]:
        """Get organization by ID."""
        with self.engine.connect() as conn:
            row = conn.execute(
                text("SELECT id, name, slug, created_at, updated_at FROM organizations WHERE id = :org_id"),
                {"org_id": org_id}
            ).mappings().first()
            
            if not row:
                return None
            
            return Organization(
                id=row["id"],
                name=row["name"],
                slug=row["slug"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
    
    def update_organization(
        self,
        org_id: str,
        name: Optional[str] = None,
        slug: Optional[str] = None,
    ) -> Optional[Organization]:
        """Update an organization."""
        updates = ["updated_at = NOW()"]
        params = {"org_id": org_id}
        
        if name is not None:
            updates.append("name = :name")
            params["name"] = name
        if slug is not None:
            updates.append("slug = :slug")
            params["slug"] = slug
        
        with self.engine.begin() as conn:
            result = conn.execute(
                text(f"UPDATE organizations SET {', '.join(updates)} WHERE id = :org_id"),
                params
            )
            
            if result.rowcount == 0:
                return None
        
        return self.get_organization(org_id)
    
    def delete_organization(self, org_id: str) -> bool:
        """Delete an organization."""
        with self.engine.begin() as conn:
            # Delete memberships first
            conn.execute(
                text("DELETE FROM organization_memberships WHERE organization_id = :org_id"),
                {"org_id": org_id}
            )
            
            result = conn.execute(
                text("DELETE FROM organizations WHERE id = :org_id"),
                {"org_id": org_id}
            )
            
            return result.rowcount > 0
    
    def list_user_organizations(self, user_id: str) -> List[Organization]:
        """List organizations a user belongs to."""
        with self.engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT o.id, o.name, o.slug, o.created_at, o.updated_at
                    FROM organizations o
                    JOIN organization_memberships om ON om.organization_id = o.id
                    WHERE om.user_id = :user_id AND om.status = 'active'
                    ORDER BY o.name
                """),
                {"user_id": user_id}
            ).mappings().all()
            
            return [
                Organization(
                    id=row["id"],
                    name=row["name"],
                    slug=row["slug"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                for row in rows
            ]
    
    def get_members(self, org_id: str) -> List[OrganizationMembership]:
        """Get all members of an organization."""
        with self.engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT om.id, om.organization_id, om.user_id, om.role, om.status,
                           om.created_at, om.updated_at,
                           u.email, u.display_name
                    FROM organization_memberships om
                    LEFT JOIN users u ON u.id = om.user_id
                    WHERE om.organization_id = :org_id
                    ORDER BY om.created_at
                """),
                {"org_id": org_id}
            ).mappings().all()
            
            return [
                OrganizationMembership(
                    id=row["id"],
                    organization_id=row["organization_id"],
                    user_id=row["user_id"],
                    role=row["role"],
                    status=row["status"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                for row in rows
            ]
    
    def add_member(
        self,
        org_id: str,
        user_id: str,
        role: str = "member",
        status: str = "active",
    ) -> OrganizationMembership:
        """Add or update a member in an organization."""
        membership_id = str(uuid4())
        now = datetime.now(timezone.utc)
        
        with self.engine.begin() as conn:
            # Check if exists
            existing = conn.execute(
                text("""
                    SELECT id FROM organization_memberships
                    WHERE organization_id = :org_id AND user_id = :user_id
                """),
                {"org_id": org_id, "user_id": user_id}
            ).first()
            
            if existing:
                conn.execute(
                    text("""
                        UPDATE organization_memberships
                        SET role = :role, status = :status, updated_at = :now
                        WHERE organization_id = :org_id AND user_id = :user_id
                    """),
                    {"org_id": org_id, "user_id": user_id, "role": role, "status": status, "now": now}
                )
                membership_id = existing[0]
            else:
                conn.execute(
                    text("""
                        INSERT INTO organization_memberships
                        (id, organization_id, user_id, role, status, created_at, updated_at)
                        VALUES (:id, :org_id, :user_id, :role, :status, :now, :now)
                    """),
                    {
                        "id": membership_id,
                        "org_id": org_id,
                        "user_id": user_id,
                        "role": role,
                        "status": status,
                        "now": now,
                    }
                )
        
        return OrganizationMembership(
            id=membership_id,
            organization_id=org_id,
            user_id=user_id,
            role=role,
            status=status,
            created_at=now,
            updated_at=now,
        )
    
    def remove_member(self, org_id: str, user_id: str) -> bool:
        """Remove a member from an organization."""
        with self.engine.begin() as conn:
            result = conn.execute(
                text("""
                    DELETE FROM organization_memberships
                    WHERE organization_id = :org_id AND user_id = :user_id
                """),
                {"org_id": org_id, "user_id": user_id}
            )
            return result.rowcount > 0


class TeamsRepo:
    """Repository for team operations."""
    
    def __init__(self, engine: Engine):
        self.engine = engine
    
    def create_team(
        self,
        name: str,
        project_id: str,
        description: Optional[str] = None,
    ) -> Team:
        """Create a new team."""
        team_id = str(uuid4())
        now = datetime.now(timezone.utc)
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO teams (id, name, project_id, description, is_active, created_at, updated_at)
                    VALUES (:id, :name, :project_id, :description, TRUE, :now, :now)
                """),
                {
                    "id": team_id,
                    "name": name,
                    "project_id": project_id,
                    "description": description,
                    "now": now,
                }
            )
        
        return Team(
            id=team_id,
            name=name,
            project_id=project_id,
            description=description,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
    
    def get_team(self, team_id: str) -> Optional[Team]:
        """Get team by ID."""
        with self.engine.connect() as conn:
            row = conn.execute(
                text("""
                    SELECT t.id, t.name, t.project_id, t.description, t.is_active,
                           t.created_at, t.updated_at,
                           pp.name as project_name,
                           (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count,
                           (SELECT COUNT(*) FROM repo_profiles rp WHERE rp.team_id = t.id) as repo_count
                    FROM teams t
                    LEFT JOIN project_profiles pp ON pp.id = t.project_id
                    WHERE t.id = :team_id
                """),
                {"team_id": team_id}
            ).mappings().first()
            
            if not row:
                return None
            
            return Team(
                id=row["id"],
                name=row["name"],
                project_id=row["project_id"],
                description=row["description"],
                is_active=row["is_active"],
                project_name=row["project_name"],
                member_count=row["member_count"],
                repo_count=row["repo_count"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
    
    def get_teams_by_project(self, project_id: str) -> List[Team]:
        """Get all teams for a project."""
        with self.engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT t.id, t.name, t.project_id, t.description, t.is_active,
                           t.created_at, t.updated_at,
                           pp.name as project_name,
                           (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count,
                           (SELECT COUNT(*) FROM repo_profiles rp WHERE rp.team_id = t.id) as repo_count
                    FROM teams t
                    LEFT JOIN project_profiles pp ON pp.id = t.project_id
                    WHERE t.project_id = :project_id AND t.is_active = TRUE
                    ORDER BY t.created_at
                """),
                {"project_id": project_id}
            ).mappings().all()
            
            return [
                Team(
                    id=row["id"],
                    name=row["name"],
                    project_id=row["project_id"],
                    description=row["description"],
                    is_active=row["is_active"],
                    project_name=row["project_name"],
                    member_count=row["member_count"],
                    repo_count=row["repo_count"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                for row in rows
            ]
    
    def update_team(
        self,
        team_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[Team]:
        """Update a team."""
        updates = ["updated_at = NOW()"]
        params = {"team_id": team_id}
        
        if name is not None:
            updates.append("name = :name")
            params["name"] = name
        if description is not None:
            updates.append("description = :description")
            params["description"] = description
        if is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = is_active
        
        with self.engine.begin() as conn:
            result = conn.execute(
                text(f"UPDATE teams SET {', '.join(updates)} WHERE id = :team_id"),
                params
            )
            
            if result.rowcount == 0:
                return None
        
        return self.get_team(team_id)
    
    def delete_team(self, team_id: str) -> bool:
        """Delete a team."""
        with self.engine.begin() as conn:
            result = conn.execute(
                text("DELETE FROM teams WHERE id = :team_id"),
                {"team_id": team_id}
            )
            return result.rowcount > 0
    
    def get_team_members(self, team_id: str) -> List[TeamMember]:
        """Get all members of a team."""
        with self.engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.permissions,
                           tm.created_at, tm.updated_at,
                           u.email as user_email,
                           COALESCE(u.display_name, u.email) as user_display_name
                    FROM team_members tm
                    JOIN users u ON u.id = tm.user_id
                    WHERE tm.team_id = :team_id
                    ORDER BY 
                        CASE tm.role 
                            WHEN 'admin' THEN 1 
                            WHEN 'reviewer' THEN 2 
                            ELSE 3 
                        END,
                        tm.created_at
                """),
                {"team_id": team_id}
            ).mappings().all()
            
            return [
                TeamMember(
                    id=row["id"],
                    team_id=row["team_id"],
                    user_id=row["user_id"],
                    role=TeamRole(row["role"]),
                    permissions=row["permissions"] or [],
                    user_email=row["user_email"],
                    user_display_name=row["user_display_name"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                for row in rows
            ]
    
    def add_member(
        self,
        team_id: str,
        user_id: str,
        role: TeamRole = TeamRole.DEVELOPER,
        permissions: Optional[List[str]] = None,
    ) -> TeamMember:
        """Add a member to a team."""
        member_id = str(uuid4())
        now = datetime.now(timezone.utc)
        perms = permissions or []
        
        with self.engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO team_members (id, team_id, user_id, role, permissions, created_at, updated_at)
                    VALUES (:id, :team_id, :user_id, :role, :permissions::jsonb, :now, :now)
                    ON CONFLICT (team_id, user_id) DO UPDATE SET
                        role = EXCLUDED.role,
                        permissions = EXCLUDED.permissions,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": member_id,
                    "team_id": team_id,
                    "user_id": user_id,
                    "role": role.value,
                    "permissions": str(perms).replace("'", '"'),
                    "now": now,
                }
            )
        
        return TeamMember(
            id=member_id,
            team_id=team_id,
            user_id=user_id,
            role=role,
            permissions=perms,
            created_at=now,
            updated_at=now,
        )
    
    def update_member(
        self,
        team_id: str,
        user_id: str,
        role: Optional[TeamRole] = None,
        permissions: Optional[List[str]] = None,
    ) -> Optional[TeamMember]:
        """Update a team member."""
        updates = ["updated_at = NOW()"]
        params = {"team_id": team_id, "user_id": user_id}
        
        if role is not None:
            updates.append("role = :role")
            params["role"] = role.value
        if permissions is not None:
            updates.append("permissions = :permissions::jsonb")
            params["permissions"] = str(permissions).replace("'", '"')
        
        with self.engine.begin() as conn:
            result = conn.execute(
                text(f"""
                    UPDATE team_members SET {', '.join(updates)}
                    WHERE team_id = :team_id AND user_id = :user_id
                """),
                params
            )
            
            if result.rowcount == 0:
                return None
        
        return self.get_member(team_id, user_id)
    
    def get_member(self, team_id: str, user_id: str) -> Optional[TeamMember]:
        """Get a specific team member."""
        with self.engine.connect() as conn:
            row = conn.execute(
                text("""
                    SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.permissions,
                           tm.created_at, tm.updated_at,
                           u.email as user_email,
                           COALESCE(u.display_name, u.email) as user_display_name
                    FROM team_members tm
                    JOIN users u ON u.id = tm.user_id
                    WHERE tm.team_id = :team_id AND tm.user_id = :user_id
                """),
                {"team_id": team_id, "user_id": user_id}
            ).mappings().first()
            
            if not row:
                return None
            
            return TeamMember(
                id=row["id"],
                team_id=row["team_id"],
                user_id=row["user_id"],
                role=TeamRole(row["role"]),
                permissions=row["permissions"] or [],
                user_email=row["user_email"],
                user_display_name=row["user_display_name"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
    
    def remove_member(self, team_id: str, user_id: str) -> bool:
        """Remove a member from a team."""
        with self.engine.begin() as conn:
            result = conn.execute(
                text("DELETE FROM team_members WHERE team_id = :team_id AND user_id = :user_id"),
                {"team_id": team_id, "user_id": user_id}
            )
            return result.rowcount > 0
    
    def get_user_teams(self, user_id: str) -> List[Tuple[Team, TeamMember]]:
        """Get all teams a user is a member of."""
        with self.engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT t.id, t.name, t.project_id, t.description, t.is_active,
                           t.created_at, t.updated_at,
                           pp.name as project_name,
                           tm.id as member_id, tm.role, tm.permissions,
                           tm.created_at as member_created_at
                    FROM team_members tm
                    JOIN teams t ON t.id = tm.team_id
                    LEFT JOIN project_profiles pp ON pp.id = t.project_id
                    WHERE tm.user_id = :user_id AND t.is_active = TRUE
                    ORDER BY t.name
                """),
                {"user_id": user_id}
            ).mappings().all()
            
            results = []
            for row in rows:
                team = Team(
                    id=row["id"],
                    name=row["name"],
                    project_id=row["project_id"],
                    description=row["description"],
                    is_active=row["is_active"],
                    project_name=row["project_name"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
                member = TeamMember(
                    id=row["member_id"],
                    team_id=row["id"],
                    user_id=user_id,
                    role=TeamRole(row["role"]),
                    permissions=row["permissions"] or [],
                    created_at=row["member_created_at"],
                )
                results.append((team, member))
            
            return results
    
    def get_user_project_access(self, user_id: str, project_id: str) -> UserTeamAccess:
        """Get a user's resolved access for a project."""
        with self.engine.connect() as conn:
            # 1. Check team membership (highest priority)
            team_row = conn.execute(
                text("""
                    SELECT tm.role, tm.permissions, t.id as team_id, t.name as team_name
                    FROM team_members tm
                    JOIN teams t ON t.id = tm.team_id
                    WHERE t.project_id = :project_id AND tm.user_id = :user_id AND t.is_active = TRUE
                    LIMIT 1
                """),
                {"project_id": project_id, "user_id": user_id}
            ).mappings().first()
            
            if team_row:
                return UserTeamAccess(
                    user_id=user_id,
                    project_id=project_id,
                    team_id=team_row["team_id"],
                    team_name=team_row["team_name"],
                    role=TeamRole(team_row["role"]),
                    permissions=team_row["permissions"] or [],
                    source="team",
                )
            
            # 2. Check org membership (mid priority)
            org_row = conn.execute(
                text("""
                    SELECT om.role
                    FROM organization_memberships om
                    JOIN project_profiles pp ON pp.organization_id = om.organization_id
                    WHERE pp.id = :project_id AND om.user_id = :user_id AND om.status = 'active'
                    LIMIT 1
                """),
                {"project_id": project_id, "user_id": user_id}
            ).mappings().first()
            
            if org_row:
                org_role = org_row["role"]
                if org_role in ("owner", "admin"):
                    team_role = TeamRole.ADMIN
                elif org_role == "reviewer":
                    team_role = TeamRole.REVIEWER
                else:
                    team_role = TeamRole.DEVELOPER
                
                return UserTeamAccess(
                    user_id=user_id,
                    project_id=project_id,
                    role=team_role,
                    permissions=[],
                    source="org",
                )
            
            # 3. Check platform role (lowest priority)
            user_row = conn.execute(
                text("SELECT role FROM users WHERE id = :user_id"),
                {"user_id": user_id}
            ).mappings().first()
            
            if user_row and user_row["role"] == "admin":
                return UserTeamAccess(
                    user_id=user_id,
                    project_id=project_id,
                    role=TeamRole.ADMIN,
                    permissions=[],
                    source="platform",
                )
            
            # No access
            return UserTeamAccess(
                user_id=user_id,
                project_id=project_id,
                role=TeamRole.DEVELOPER,
                permissions=[],
                source="none",
            )
    
    def get_team_with_stats(self, team_id: str) -> Optional[TeamWithStats]:
        """Get team with statistics."""
        team = self.get_team(team_id)
        if not team:
            return None
        
        with self.engine.connect() as conn:
            # Role counts
            role_counts = conn.execute(
                text("""
                    SELECT role, COUNT(*) as count
                    FROM team_members
                    WHERE team_id = :team_id
                    GROUP BY role
                """),
                {"team_id": team_id}
            ).mappings().all()
            
            admin_count = 0
            reviewer_count = 0
            developer_count = 0
            
            for row in role_counts:
                if row["role"] == "admin":
                    admin_count = row["count"]
                elif row["role"] == "reviewer":
                    reviewer_count = row["count"]
                else:
                    developer_count = row["count"]
            
            # Review stats
            review_stats = conn.execute(
                text("""
                    SELECT 
                        COUNT(*) FILTER (WHERE a.status IN ('RUNNING', 'QUEUED', 'RECEIVED')) as active_reviews,
                        COUNT(*) as total_reviews,
                        AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at)) / 3600) as avg_time_hours
                    FROM analyses a
                    JOIN repo_profiles rp ON rp.repo_id = a.repo_id
                    WHERE rp.team_id = :team_id
                """),
                {"team_id": team_id}
            ).mappings().first()
            
            return TeamWithStats(
                team=team,
                total_members=admin_count + reviewer_count + developer_count,
                admin_count=admin_count,
                reviewer_count=reviewer_count,
                developer_count=developer_count,
                active_reviews=review_stats["active_reviews"] or 0 if review_stats else 0,
                total_reviews=review_stats["total_reviews"] or 0 if review_stats else 0,
                avg_review_time_hours=review_stats["avg_time_hours"] or 0.0 if review_stats else 0.0,
            )
