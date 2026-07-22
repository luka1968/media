// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// 将 site 替换为你的 GitHub 用户名，例如：https://johndoe.github.io/news
export default defineConfig({
  site: 'https://用户名.github.io/news',
  base: '/news',
  output: 'static',
  build: {
    format: 'directory',
  },
});
