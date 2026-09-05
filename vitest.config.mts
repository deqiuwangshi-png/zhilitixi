// vitest 配置：单测 + 集成测试统一入口（pnpm test = vitest run）。
// - '@' 别名对齐 tsconfig paths（src/*）。
// - 'server-only' 在 pnpm 严格 node_modules 布局下不挂在根目录，Next 打包器外不可解析，
//   测试环境统一映射到空桩（tests/stubs/server-only.js），与既有 node:test 方案一致。
// - 真实库集成测试（tests/integration/db-rpc.test.ts）由用例内 describe.skipIf 守卫，
//   无 DATABASE_URL 时跳过而非失败（对齐 scripts/db.mjs 的 --allow-offline 哲学）。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(ROOT, 'src'),
      'server-only': path.join(ROOT, 'tests', 'stubs', 'server-only.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'build/**', 'out/**', '.next/**'],
  },
});
