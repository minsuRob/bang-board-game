// 엔진·AI·경제 모듈을 ../src/game 에서 상대 경로로 끌어와 lib/index.js 하나로 묶는다.
// Firebase 는 functions/ 폴더만 올리므로 번들에 들어가지 않은 코드는 서버에 없다.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'lib/index.js',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-functions'],
  logLevel: 'info',
});
