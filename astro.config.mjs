import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://madcry.com',
  integrations: [
    tailwind(),
    vue(),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/success'),
      changefreq: 'weekly',
      priority: 0.7,
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES' },
      },
    }),
  ],
  vite: {
    define: {},
  },
});
