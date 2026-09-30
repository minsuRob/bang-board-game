import { defineConfig } from 'vitest/config';

// firestore.rules 검증 전용. Firestore 에뮬레이터 안에서만 돈다 (npm run test:rules).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 30000,
    // 테스트 파일끼리 같은 에뮬레이터 DB 를 비우므로 차례로 돌린다
    fileParallelism: false,
  },
});
