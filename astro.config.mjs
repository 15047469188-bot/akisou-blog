import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://izumi1229.github.io',
  base: '/',

  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },

  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
  },
});
