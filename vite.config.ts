import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' allows loading all env vars, not just VITE_ prefixed ones.
  const env = loadEnv(mode, process.cwd(), '');

  // PRIORITY: 
  // 1. System Environment (process.env) - Used by GitHub Actions Secrets
  // 2. .env file (env) - Used during local development
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    // Vital for GitHub Pages: Ensures assets are loaded relative to the index.html
    // This allows the app to work in a subdirectory (e.g., username.github.io/repo-name/)
    base: './', 
    define: {
      // This embeds the API key into the code during the build process.
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
  };
});