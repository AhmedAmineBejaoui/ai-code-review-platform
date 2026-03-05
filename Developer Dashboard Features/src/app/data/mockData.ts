export type Severity = 'INFO' | 'WARN' | 'BLOCKER';
export type Status = 'queued' | 'running' | 'done' | 'failed';
export type Category = 'security' | 'performance' | 'quality' | 'maintainability';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: Category;
  file: string;
  line: number;
  description: string;
  suggestion: string;
  resolved: boolean;
}

export interface Analysis {
  id: string;
  repo: string;
  pr: string;
  commit: string;
  date: string;
  author: string;
  status: Status;
  duration: string;
  findings: Finding[];
  blockerCount: number;
  warnCount: number;
  infoCount: number;
}

export interface RagSource {
  id: string;
  title: string;
  date: string;
  section: string;
  excerpt: string;
  score: number;
  link: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'dev' | 'reviewer' | 'admin';
  avatar: string;
}

export const currentUser: User = {
  id: '1',
  name: 'Sophie Martin',
  email: 'sophie.martin@company.com',
  role: 'reviewer',
  avatar: 'SM',
};

export const mockAnalyses: Analysis[] = [
  {
    id: '1',
    repo: 'backend-api',
    pr: 'PR #456',
    commit: 'a3f2c1d',
    date: '2026-03-04T10:30:00',
    author: 'Jean Dupont',
    status: 'done',
    duration: '2m 34s',
    blockerCount: 2,
    warnCount: 5,
    infoCount: 8,
    findings: [
      {
        id: 'f1',
        title: 'SQL Injection risk',
        severity: 'BLOCKER',
        category: 'security',
        file: 'src/api/users.ts',
        line: 42,
        description: 'Utilisation directe de paramètres utilisateur dans une requête SQL sans validation ni échappement.',
        suggestion: 'Utilisez des requêtes préparées ou un ORM avec paramètres bindés.',
        resolved: false,
      },
      {
        id: 'f2',
        title: 'XSS vulnerability',
        severity: 'BLOCKER',
        category: 'security',
        file: 'src/components/UserProfile.tsx',
        line: 156,
        description: 'Le contenu utilisateur est affiché sans échappement HTML.',
        suggestion: 'Utilisez dangerouslySetInnerHTML uniquement si nécessaire, et sanitisez les entrées.',
        resolved: false,
      },
      {
        id: 'f3',
        title: 'Inefficient database query',
        severity: 'WARN',
        category: 'performance',
        file: 'src/api/posts.ts',
        line: 78,
        description: 'Requête N+1 détectée dans une boucle.',
        suggestion: 'Utilisez un JOIN ou un batch loading pour réduire le nombre de requêtes.',
        resolved: false,
      },
      {
        id: 'f4',
        title: 'Missing error handling',
        severity: 'WARN',
        category: 'quality',
        file: 'src/api/payments.ts',
        line: 234,
        description: 'Appel async sans gestion d\'erreur try/catch.',
        suggestion: 'Ajoutez un bloc try/catch ou utilisez .catch() sur la Promise.',
        resolved: false,
      },
      {
        id: 'f5',
        title: 'Magic number',
        severity: 'INFO',
        category: 'maintainability',
        file: 'src/utils/helpers.ts',
        line: 12,
        description: 'Valeur numérique non explicitée (3600).',
        suggestion: 'Créez une constante nommée SECONDS_IN_HOUR = 3600.',
        resolved: false,
      },
    ],
  },
  {
    id: '2',
    repo: 'frontend-app',
    pr: 'PR #457',
    commit: 'b7e9a2f',
    date: '2026-03-04T09:15:00',
    author: 'Marie Laurent',
    status: 'running',
    duration: '1m 12s',
    blockerCount: 0,
    warnCount: 3,
    infoCount: 4,
    findings: [],
  },
  {
    id: '3',
    repo: 'backend-api',
    pr: 'PR #455',
    commit: 'c1d4e8a',
    date: '2026-03-03T16:45:00',
    author: 'Thomas Bernard',
    status: 'done',
    duration: '3m 01s',
    blockerCount: 1,
    warnCount: 2,
    infoCount: 6,
    findings: [],
  },
  {
    id: '4',
    repo: 'mobile-app',
    pr: 'PR #342',
    commit: 'd9f2c3b',
    date: '2026-03-03T14:20:00',
    author: 'Sophie Martin',
    status: 'done',
    duration: '1m 47s',
    blockerCount: 0,
    warnCount: 1,
    infoCount: 3,
    findings: [],
  },
  {
    id: '5',
    repo: 'data-pipeline',
    pr: 'PR #128',
    commit: 'e4b7f1c',
    date: '2026-03-03T11:30:00',
    author: 'Luc Moreau',
    status: 'failed',
    duration: '0m 45s',
    blockerCount: 0,
    warnCount: 0,
    infoCount: 0,
    findings: [],
  },
];

export const mockRagSources: RagSource[] = [
  {
    id: 'rag1',
    title: 'OWASP Top 10 - Injection',
    date: '2023-10-15',
    section: 'A03:2021 – Injection',
    excerpt: 'SQL injection occurs when untrusted data is sent to an interpreter as part of a command or query. Always use parameterized queries or prepared statements to prevent SQL injection attacks.',
    score: 0.94,
    link: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
  {
    id: 'rag2',
    title: 'Security Best Practices Guide',
    date: '2024-01-20',
    section: 'Input Validation',
    excerpt: 'All user inputs must be validated and sanitized before being used in database queries, HTML rendering, or system commands. Use allow-lists when possible.',
    score: 0.89,
    link: '/docs/security-guide',
  },
  {
    id: 'rag3',
    title: 'Code Review Checklist',
    date: '2024-02-10',
    section: 'Database Access',
    excerpt: 'Review all database queries for proper parameter binding. Never concatenate user input directly into SQL strings. Use ORM features or prepared statements.',
    score: 0.85,
    link: '/docs/review-checklist',
  },
];

export const mockDiffContent = `--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -38,8 +38,8 @@ export async function getUserById(userId: string) {
 }
 
 export async function searchUsers(query: string) {
-  const sql = "SELECT * FROM users WHERE name LIKE '%" + query + "%'";
-  return await db.execute(sql);
+  const sql = "SELECT * FROM users WHERE name LIKE ?";
+  return await db.execute(sql, ['%' + query + '%']);
 }
 
 export async function updateUser(userId: string, data: UserData) {`;

export const mockFiles = [
  { path: 'src/api/users.ts', additions: 2, deletions: 2 },
  { path: 'src/components/UserProfile.tsx', additions: 5, deletions: 3 },
  { path: 'src/api/posts.ts', additions: 10, deletions: 4 },
  { path: 'src/api/payments.ts', additions: 3, deletions: 1 },
  { path: 'src/utils/helpers.ts', additions: 2, deletions: 1 },
];

export const mockKbDocuments = [
  {
    id: 'kb1',
    title: 'OWASP Security Guidelines',
    source: 'External Documentation',
    lastIndexed: '2026-03-01',
    chunks: 142,
    status: 'indexed',
  },
  {
    id: 'kb2',
    title: 'Company Coding Standards',
    source: 'Internal Wiki',
    lastIndexed: '2026-02-28',
    chunks: 89,
    status: 'indexed',
  },
  {
    id: 'kb3',
    title: 'Performance Best Practices',
    source: 'Google Drive',
    lastIndexed: '2026-02-25',
    chunks: 56,
    status: 'outdated',
  },
];
