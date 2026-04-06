/**
 * Mobile Build Script for Capacitor
 * 
 * This script handles building the Next.js app for Capacitor by:
 * 1. Temporarily moving API routes (they don't work in static export)
 * 2. Temporarily moving dynamic route pages (handled by SPA fallback)
 * 3. Using a mobile-specific Next.js config
 * 4. Building the static export
 * 5. Setting up SPA fallback (copying 404.html to handle all routes)
 * 6. Restoring everything
 * 
 * Usage: node scripts/build-mobile.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_DIR = path.join(__dirname, '..');
const API_DIR = path.join(APP_DIR, 'app', 'api');
const API_BACKUP_DIR = path.join(APP_DIR, '.api-backup');
const DYNAMIC_BACKUP_DIR = path.join(APP_DIR, '.dynamic-backup');
const CONFIG_FILE = path.join(APP_DIR, 'next.config.js');
const CONFIG_BACKUP = path.join(APP_DIR, 'next.config.backup.js');
const MOBILE_CONFIG = path.join(APP_DIR, 'next.config.mobile.js');
const OUT_DIR = path.join(APP_DIR, 'out');
const MIDDLEWARE_FILE = path.join(APP_DIR, 'middleware.ts');
const MIDDLEWARE_BACKUP = path.join(APP_DIR, 'middleware.backup.ts');

// Dynamic route patterns to exclude from build
// These will be handled by the SPA fallback (not-found.tsx -> 404.html)
const DYNAMIC_ROUTES_TO_BACKUP = [
  'app/dashboard/projects/[projectId]',
  'app/dashboard/diff/[id]',
  'app/dashboard/history/[id]',
  'app/dashboard/rag/[id]',
  'app/dashboard/report/[id]',
  'app/dashboard/review/[id]',
  'app/dashboard/admin/projects/[projectId]',
  // Marketing pages use server-side auth that's incompatible with static export
  'app/(marketing)',
  // Sign-in/sign-up with Clerk - will be handled differently in mobile
  'app/sign-in',
  'app/sign-up',
  // Keep organization routes as they use optional catch-all with static export support
  // 'app/dashboard/organization/[[...rest]]',
  // 'app/dashboard/admin/organization/[[...rest]]',
];

// Files that need to be replaced with mobile-compatible versions
const FILES_TO_REPLACE = [
  {
    original: 'app/dashboard/layout.tsx',
    mobile: 'scripts/mobile-overrides/dashboard-layout.tsx',
  },
  {
    original: 'app/dashboard/admin/layout.tsx',
    mobile: 'scripts/mobile-overrides/admin-layout.tsx',
  },
  {
    original: 'app/dashboard/page.tsx',
    mobile: 'scripts/mobile-overrides/dashboard-page.tsx',
  },
  {
    original: 'app/auth/page.tsx',
    mobile: 'scripts/mobile-overrides/auth-page.tsx',
  },
  {
    original: 'lib/auth.ts',
    mobile: 'scripts/mobile-overrides/auth.ts',
  },
  {
    original: 'lib/backend-admin.ts',
    mobile: 'scripts/mobile-overrides/backend-admin.ts',
  },
  {
    original: 'lib/github.ts',
    mobile: 'scripts/mobile-overrides/github.ts',
  },
];

function log(message) {
  console.log(`[Mobile Build] ${message}`);
}

function backupApiRoutes() {
  log('Backing up API routes...');
  if (fs.existsSync(API_DIR)) {
    if (fs.existsSync(API_BACKUP_DIR)) {
      fs.rmSync(API_BACKUP_DIR, { recursive: true });
    }
    fs.renameSync(API_DIR, API_BACKUP_DIR);
    log('API routes backed up to .api-backup');
  }
}

function restoreApiRoutes() {
  log('Restoring API routes...');
  if (fs.existsSync(API_BACKUP_DIR)) {
    if (fs.existsSync(API_DIR)) {
      fs.rmSync(API_DIR, { recursive: true });
    }
    fs.renameSync(API_BACKUP_DIR, API_DIR);
    log('API routes restored');
  }
}

/**
 * Backup middleware file (not compatible with static export)
 */
function backupMiddleware() {
  log('Backing up middleware...');
  if (fs.existsSync(MIDDLEWARE_FILE)) {
    fs.copyFileSync(MIDDLEWARE_FILE, MIDDLEWARE_BACKUP);
    fs.unlinkSync(MIDDLEWARE_FILE);
    log('Middleware backed up');
  }
}

/**
 * Restore middleware file
 */
function restoreMiddleware() {
  log('Restoring middleware...');
  if (fs.existsSync(MIDDLEWARE_BACKUP)) {
    fs.copyFileSync(MIDDLEWARE_BACKUP, MIDDLEWARE_FILE);
    fs.unlinkSync(MIDDLEWARE_BACKUP);
    log('Middleware restored');
  }
}

// Track file replacements for restoration
const fileReplacements = new Map();

/**
 * Replace files with mobile-compatible versions
 */
function replaceWithMobileVersions() {
  log('Replacing files with mobile-compatible versions...');
  
  const overridesDir = path.join(APP_DIR, 'scripts', 'mobile-overrides');
  
  // Ensure overrides directory exists
  if (!fs.existsSync(overridesDir)) {
    log('  Warning: mobile-overrides directory not found, skipping replacements');
    return;
  }
  
  for (const replacement of FILES_TO_REPLACE) {
    const originalPath = path.join(APP_DIR, replacement.original);
    const mobilePath = path.join(APP_DIR, replacement.mobile);
    
    if (fs.existsSync(originalPath) && fs.existsSync(mobilePath)) {
      // Store original content
      const originalContent = fs.readFileSync(originalPath, 'utf-8');
      fileReplacements.set(originalPath, originalContent);
      
      // Replace with mobile version
      const mobileContent = fs.readFileSync(mobilePath, 'utf-8');
      fs.writeFileSync(originalPath, mobileContent);
      
      log(`  Replaced: ${replacement.original}`);
    } else {
      if (!fs.existsSync(mobilePath)) {
        log(`  Warning: Mobile override not found: ${replacement.mobile}`);
      }
    }
  }
}

/**
 * Restore original files after mobile replacement
 */
function restoreReplacedFiles() {
  log('Restoring replaced files...');
  
  for (const [filePath, originalContent] of fileReplacements) {
    fs.writeFileSync(filePath, originalContent);
    log(`  Restored: ${path.relative(APP_DIR, filePath)}`);
  }
  
  fileReplacements.clear();
}

/**
 * Backup dynamic route directories that can't be statically exported
 */
function backupDynamicRoutes() {
  log('Backing up dynamic route pages...');
  
  if (fs.existsSync(DYNAMIC_BACKUP_DIR)) {
    fs.rmSync(DYNAMIC_BACKUP_DIR, { recursive: true });
  }
  fs.mkdirSync(DYNAMIC_BACKUP_DIR, { recursive: true });
  
  let backedUp = 0;
  
  for (const routePath of DYNAMIC_ROUTES_TO_BACKUP) {
    const fullPath = path.join(APP_DIR, routePath);
    const backupPath = path.join(DYNAMIC_BACKUP_DIR, routePath);
    
    if (fs.existsSync(fullPath)) {
      // Create backup directory structure
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      
      // Copy directory to backup
      copyDirRecursive(fullPath, backupPath);
      
      // Remove original
      fs.rmSync(fullPath, { recursive: true });
      
      backedUp++;
      log(`  Backed up: ${routePath}`);
    }
  }
  
  log(`Backed up ${backedUp} dynamic route directories`);
}

/**
 * Restore dynamic route directories
 */
function restoreDynamicRoutes() {
  log('Restoring dynamic route pages...');
  
  if (!fs.existsSync(DYNAMIC_BACKUP_DIR)) {
    return;
  }
  
  for (const routePath of DYNAMIC_ROUTES_TO_BACKUP) {
    const fullPath = path.join(APP_DIR, routePath);
    const backupPath = path.join(DYNAMIC_BACKUP_DIR, routePath);
    
    if (fs.existsSync(backupPath)) {
      // Remove any existing directory
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true });
      }
      
      // Ensure parent directory exists
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      
      // Copy back from backup
      copyDirRecursive(backupPath, fullPath);
    }
  }
  
  // Clean up backup directory
  fs.rmSync(DYNAMIC_BACKUP_DIR, { recursive: true });
  log('Dynamic routes restored');
}

/**
 * Recursively copy a directory
 */
function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function backupConfig() {
  log('Backing up Next.js config...');
  if (fs.existsSync(CONFIG_FILE)) {
    fs.copyFileSync(CONFIG_FILE, CONFIG_BACKUP);
  }
}

function useMobileConfig() {
  log('Switching to mobile config...');
  if (fs.existsSync(MOBILE_CONFIG)) {
    fs.copyFileSync(MOBILE_CONFIG, CONFIG_FILE);
  }
}

function restoreConfig() {
  log('Restoring Next.js config...');
  if (fs.existsSync(CONFIG_BACKUP)) {
    fs.copyFileSync(CONFIG_BACKUP, CONFIG_FILE);
    fs.unlinkSync(CONFIG_BACKUP);
  }
}

function cleanBuildDirs() {
  log('Cleaning build directories...');
  const nextDir = path.join(APP_DIR, '.next');
  
  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
  }
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true });
  }
}

function runBuild() {
  log('Running Next.js build...');
  try {
    execSync('npx next build', {
      cwd: APP_DIR,
      stdio: 'inherit',
      env: { ...process.env, MOBILE_BUILD: 'true' }
    });
    return true;
  } catch (error) {
    console.error('Build failed:', error.message);
    return false;
  }
}

/**
 * Setup SPA fallback for Capacitor
 * This copies the 404.html to index.html in routes that need fallback
 * and creates a fallback file for the Capacitor server
 */
function setupSpaFallback() {
  log('Setting up SPA fallback for dynamic routes...');
  
  const notFoundHtml = path.join(OUT_DIR, '404.html');
  
  if (!fs.existsSync(notFoundHtml)) {
    log('Warning: 404.html not found, SPA fallback may not work correctly');
    return;
  }
  
  // Read the 404.html content
  const fallbackContent = fs.readFileSync(notFoundHtml, 'utf-8');
  
  // Create directory structure for dynamic routes and place fallback
  const dynamicRouteDirs = [
    'dashboard/projects',
    'dashboard/diff',
    'dashboard/history',
    'dashboard/rag',
    'dashboard/report',
    'dashboard/review',
    'dashboard/admin/projects',
  ];
  
  for (const routeDir of dynamicRouteDirs) {
    const fullDir = path.join(OUT_DIR, routeDir);
    fs.mkdirSync(fullDir, { recursive: true });
    
    // Create a wildcard index.html that will act as fallback
    // Capacitor's server will serve this for unknown sub-paths
    const wildcardIndex = path.join(fullDir, '_fallback.html');
    fs.writeFileSync(wildcardIndex, fallbackContent);
    
    log(`  Created fallback for: /${routeDir}/`);
  }
  
  // Also copy 404.html to index.html at root as ultimate fallback
  // This helps with deep linking on mobile
  const rootFallback = path.join(OUT_DIR, '_fallback.html');
  fs.copyFileSync(notFoundHtml, rootFallback);
  
  log('SPA fallback setup complete');
}

/**
 * Create Capacitor server config for proper SPA routing
 */
function createCapacitorServerConfig() {
  log('Creating Capacitor server configuration...');
  
  const serverConfigPath = path.join(OUT_DIR, 'capacitor-server.json');
  const serverConfig = {
    // This tells Capacitor to serve 404.html for unknown routes
    fallback: '404.html',
    spa: true
  };
  
  fs.writeFileSync(serverConfigPath, JSON.stringify(serverConfig, null, 2));
  log('Capacitor server config created');
}

function syncCapacitor() {
  log('Syncing Capacitor...');
  try {
    execSync('npx cap sync', {
      cwd: APP_DIR,
      stdio: 'inherit'
    });
    return true;
  } catch (error) {
    console.error('Capacitor sync failed:', error.message);
    return false;
  }
}

async function main() {
  log('Starting mobile build process...');
  log('');
  
  let success = false;
  
  try {
    // Step 1: Backup and prepare
    backupApiRoutes();
    backupMiddleware();
    backupDynamicRoutes();
    replaceWithMobileVersions();
    backupConfig();
    useMobileConfig();
    cleanBuildDirs();
    
    // Step 2: Build
    success = runBuild();
    
    if (success) {
      // Step 3: Setup SPA fallback for dynamic routes
      setupSpaFallback();
      createCapacitorServerConfig();
      
      // Step 4: Sync with Capacitor
      success = syncCapacitor();
    }
    
  } catch (error) {
    console.error('Build process error:', error);
    success = false;
  } finally {
    // Step 5: Restore everything
    restoreReplacedFiles();
    restoreConfig();
    restoreMiddleware();
    restoreApiRoutes();
    restoreDynamicRoutes();
  }
  
  log('');
  if (success) {
    log('========================================');
    log('  Mobile build completed successfully!');
    log('========================================');
    log('');
    log('The build uses SPA fallback for dynamic routes.');
    log('Dynamic pages like /dashboard/projects/:id will be');
    log('handled client-side via the not-found page.');
    log('');
    log('Next steps:');
    log('  - Add iOS platform:       npm run mobile:add:ios');
    log('  - Add Android platform:   npm run mobile:add:android');
    log('  - Open in Xcode:          npm run mobile:ios');
    log('  - Open in Android Studio: npm run mobile:android');
    log('');
  } else {
    log('Mobile build failed!');
    process.exit(1);
  }
}

main();
