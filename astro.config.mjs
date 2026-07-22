// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 如果你在 Cloudflare 上绑定了自定义域名，可以在这里配置，例如：'https://yourdomain.com'
  // site: 'https://yourdomain.com',
  output: 'static',
  build: {
    format: 'directory',
  },
});
