import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import remarkBlur from './scripts/remark-blur.mjs';

export default defineConfig({
  output: 'static',
  site: 'https://izumi1229.github.io',
  base: '/',

  markdown: {
    processor: unified({
      remarkPlugins: [remarkDirective, remarkBlur],
    }),
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
