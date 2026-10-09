import { defineConfig } from 'astro/config';
import remarkBlur from './scripts/remark-blur.mjs';

export default defineConfig({
  output: 'static',
  site: 'https://izumi1229.github.io',
  base: '/',

  markdown: {
    remarkPlugins: [remarkBlur],
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
