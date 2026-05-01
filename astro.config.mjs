import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://madcry.com',
  integrations: [tailwind(), vue()],
  vite: {
    define: {
      // Astro inyecta automaticamente PUBLIC_* en cliente
    },
  },
});