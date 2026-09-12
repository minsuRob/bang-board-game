// https://docs.expo.dev/versions/v57.0.0/config/metro/
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// three.js 로더가 읽을 수 있는 3D 에셋. 지금은 안 쓰지만 metro 가 모르면 번들이 깨진다.
config.resolver.assetExts.push('glb', 'gltf');

/**
 * three 는 ESM 전용이 됐다. `build/three.cjs` 는 `process.emitWarning()` 을 부르고 ESM 을
 * 다시 내보내는 스텁이라 Hermes 에서 초기화 중에 터진다 (@react-three/fiber 네이티브 빌드가
 * `require('three')` 를 한다). 모든 플랫폼에서 ESM 빌드를 직접 물려 준다.
 */
const THREE_ESM = path.resolve(__dirname, 'node_modules/three/build/three.module.js');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') return { type: 'sourceFile', filePath: THREE_ESM };
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
