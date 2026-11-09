import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 相对路径：同一份 dist 既能部署在域名根目录，也能部署在 /<repo>/ 子路径下
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
