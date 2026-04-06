import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aicodeview.app',
  appName: 'AI Code Review',
  webDir: 'out', // Next.js static export directory
  
  // Server configuration
  server: {
    // URL of the backend API (configure per environment)
    url: process.env.CAPACITOR_SERVER_URL,
    cleartext: true, // Allow HTTP for local dev
    // Enable SPA-style navigation - serve index.html for unknown routes
    // This is handled by our custom 404.html fallback
    hostname: 'localhost',
  },

  // iOS configuration
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'AI Code Review',
    backgroundColor: '#0a0a0a', // Dark theme background
    // Handle URLs within the app
    allowsLinkPreview: false,
  },

  // Android configuration
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true, // For development
    captureInput: true,
    webContentsDebuggingEnabled: true, // Disable in production
    // Handle back button in app
    overrideUserAgent: 'AICodeReview-Mobile',
  },

  // Plugins configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#3b82f6',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a0a',
    },
  },
};

export default config;
