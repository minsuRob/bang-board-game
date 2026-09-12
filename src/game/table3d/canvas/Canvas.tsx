/**
 * r3f Canvas.
 *
 * `@react-three/fiber` 는 package.json 의 `react-native` 필드로 네이티브 빌드를,
 * 웹에서는 DOM 빌드를 준다. Expo metro 가 그 필드를 먼저 보므로 import 경로는 하나다.
 * 플랫폼별로 갈라야 할 일이 생기면 여기서만 가른다.
 */

export { Canvas } from '@react-three/fiber';
