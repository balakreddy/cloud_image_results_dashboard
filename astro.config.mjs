// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  base: '/dashboard',
  output: 'static',
  integrations: [tailwind()],
  build: {
    format: 'directory'
  },
  vite: {
    server: {
      proxy: {
        // Proxy Azure blob storage requests in development to avoid CORS
        '/azure-data': {
          target: 'https://fedoratestresults.z5.web.core.windows.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/azure-data/, '')
        }
      }
    }
  }
});
