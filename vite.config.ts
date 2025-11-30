import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // Vital for GitHub Pages: Ensures assets are loaded relative to the index.html
    base: './', 
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    // Removed server proxy as GitHub Pages is a static host
  };
});