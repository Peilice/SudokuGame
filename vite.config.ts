/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { offline } from './scripts/offline-plugin';

// 使用相對路徑，部署到 GitHub Pages 的任何子路徑皆可運作
export default defineConfig({
  base: './',
  plugins: [offline()],
  test: {
    // 出題需要反覆嘗試，困難與專家題可能耗時較久
    testTimeout: 30000,
  },
});
