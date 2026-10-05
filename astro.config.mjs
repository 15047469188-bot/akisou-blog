import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://akisou-blog.github.io',
  base: '/akisou-blog',

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
