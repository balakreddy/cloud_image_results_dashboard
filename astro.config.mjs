// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  base: '/dashboard',
  output: 'static',
  integrations: [tailwind()],
  build: {
    format: 'directory'
  }
});
