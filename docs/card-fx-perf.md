# 카드 연출 성능과 화질 3단계

카드를 낼 때 버벅이는 원인을 코드에서 찾고, 지금의 2단계(고화질·일반)를 3단계로 나누는 안을 적는다.
코드는 아직 고치지 않았다. 이 문서는 분석과 설계안이다.

## 한 줄 결론

버벅임은 연출 하나가 무거워서라기보다 **세 가지가 같은 순간에 겹쳐서** 생긴다.
화면 전체에 도는 fbm 연기 셰이더(GPU), 카메라 흔들림 동안 매 프레임 다시 그려지는 오버레이 React 트리(JS),
그리고 같은 순간 함께 도는 3D 테이블이다. 단계 나누기보다 먼저 **단계와 상관없는 고침 3가지**를 넣고,
그다음 저·중·고로 나누는 것이 맞다.

## 가장 효과 큰 고침 3가지 (예상 효과 순)

| 순서 | 고침 | 근거 | 기대 효과 |
|---|---|---|---|
| 1 | **연기 셰이더를 총구 둘레 사각형에만 그린다.** 지금은 캔버스 전체(테이블 영역 전부)에 5옥타브 fbm 을 1.9초 동안 돌린다 | `CardFxSkia.tsx:227-231` 의 `<Rect x={0} y={0} width={w} height={h}>`, `shaders.ts:37` 5옥타브, `shotFrame` 의 `smoke` 는 60ms~2000ms 동안 0 이 아님(`timeline.ts:145`) | 연기가 실제로 보이는 곳은 총구 앞 카드 폭 2~3배 정도다. 그리는 픽셀이 대략 1/10~1/20 로 준다. 폰 GPU 에서 가장 큰 비용으로 본다 (추측, 측정 필요) |
| 2 | **카드 낼 때 매 프레임 일어나는 React 재렌더를 끊는다.** `Overlay3D` 가 앵커 스토어 전체를 구독해서, 카메라가 흔들리는 동안 매 프레임 Overlay3D → `PlayedCardSpotlight` → Skia 캔버스 자식 트리까지 다시 렌더된다 | `Overlay3D.tsx:41` `useStore(anchorsStore)` (선택자 없음), `Scene.tsx:147` 카메라가 움직이면 매 프레임 `project`, `AnchorProjector.ts:135-137` 0.5px 넘게 바뀌면 `setState`, 뱅!은 `Sequencer.ts:142` `rig.punch`, 피해는 `fx-plan.ts:139` `shake`. Skia `Canvas` 는 자식이 바뀔 때마다 `root.render(children)` (`node_modules/@shopify/react-native-skia/lib/module/renderer/Canvas.js:98-100`) | 네이티브에서 r3f(expo-gl)는 JS 스레드에서 그리므로, 재렌더가 3D 프레임과 같은 스레드를 다툰다. 웹은 모든 것이 메인 스레드 하나다. 카드 낸 직후 0.1~0.5초 끊김의 주범 후보 |
| 3 | **쉬는 동안의 Skia 캔버스 비용을 없앤다.** `onSize` 를 주면 Skia 가 Reanimated 프레임 콜백을 **영원히** 돌리며 매 프레임 캔버스를 잰다. 웹은 기기 픽셀 비율 상한도 없다 | `CardFxSkia.tsx:218` `onSize={size}` → `Canvas.js:63-95` `useFrameCallback(..., !!onSize)`. 웹 `SkiaPictureView.web.js:43-44,173` 이 `window.devicePixelRatio` 그대로(`Platform.web.js:125`). 3D 는 `dpr={[1, 2]}` 로 상한이 있다(`Table3D.tsx:156`) | 판 내내 매 프레임 `measure` 한 번이 사라진다. 크기는 `fireHq` 에서 이미 재는 `layerBox`(`PlayedCardSpotlight.tsx:457`)로 넣으면 된다 |

이 셋은 화질 단계와 상관없이 고화질의 모양을 바꾸지 않는다. 먼저 넣고 재 본 다음 단계를 나눈다.

## 카드를 낼 때 일어나는 일

```
엔진 전이
 ├─ fx-bridge → 3D 배치 (카드 이동, 뱅 줄기·고리, 카메라 punch/shake, 파티클)     table3d/core/fx-bridge.ts:14
 └─ view.log 변화 → PlayedCardSpotlight 가 카드를 띄움                           PlayedCardSpotlight.tsx:238
      180ms 뒤 fireHq: measureInWindow ×2 → geom → progress 0→1 (2.0s / 2.4s)    :457-478
      같은 틱에 playSfx, 800ms 뒤 휘익                                             :480-485
```

3D 와 2D 연출이 **같은 순간** 시작한다. 그래서 GL 표면 두 개(3D 테이블, Skia 캔버스)가 동시에 매 프레임 그린다.

## 원인 목록

**확인** 은 코드로 동작을 확인한 것, **추측** 은 그럴 만하지만 재 봐야 하는 것이다.

### GPU (그리는 비용)

| 원인 | 근거 | 구분 | 메모 |
|---|---|---|---|
| 연기 셰이더가 캔버스 전체 크기 | `CardFxSkia.tsx:227-231` | 확인 | 픽셀마다 `noise` 5번(`hash` 의 `sin` 20번). 비용 크기는 추측 |
| `stage` 확대(최대 1.45배) 안에 셰이더가 있음 | `CardFxSkia.tsx:223`, `timeline.ts:114` | 확인 | 확대해도 그리는 픽셀 수는 같다(전체 사각형). 1번 고침으로 같이 해결 |
| BlurMask 8개 (고리, 충격파, 불티 2, 예광, 불덩이 6, 줄기 3, 심 4) | `CardFxSkia.tsx:237-288` | 확인 | 각각 블러 패스. 섬광 구간(0~950ms)에 겹친다 |
| 빗나감! 그림 4장 + `<Blur blur={14}>` 이미지 필터 | `MissedSkia.tsx:209-222` | 확인 | 흐린 그림은 매 프레임 새로 흐린다. 한 번 흐려 둔 그림을 재사용하면 된다 |
| 전체 화면 사각형 3장 (비네트 방사 그라데이션, 연기, 번쩍) | `CardFxSkia.tsx:219-221, 227-231, 293` | 확인 | 비네트·번쩍은 단색·그라데이션이라 싸다 |
| 웹 Skia 캔버스가 `devicePixelRatio` 그대로 | `SkiaPictureView.web.js:43,173` | 확인 | 폰 브라우저는 3배. 3D 는 2배로 묶여 있다. 라이브러리 상수라 우리 쪽에서 바로 못 바꾼다 |
| GL 표면 두 개가 투명 합성 | 3D `Table3D.tsx:153`, Skia 캔버스 `PlayedCardSpotlight.tsx:339` (테이블 영역 전체) | 확인 | 합성 비용 자체는 추측. 쉬는 동안에도 투명 레이어가 위에 있다 |

### JS / UI 스레드

| 원인 | 근거 | 구분 | 메모 |
|---|---|---|---|
| 카메라 흔들림 동안 Overlay3D 매 프레임 재렌더 | 위 "고침 2" | 확인 | 좌석 이름표·호버·스포트라이트까지 전부 |
| `CardFxSkiaLayer` 가 `memo` 아님 | `CardFxSkia.tsx:77`, `PlayedCardSpotlight.tsx:339` | 확인 | `PlayedCardSpotlight` 가 렌더될 때마다(로그·손패·peek 변화) Skia 트리 재조정. 연출 중이 아니어도 |
| Skia `onSize` 프레임 콜백이 판 내내 돈다 | 위 "고침 3" | 확인 | 네이티브는 UI 스레드, 웹은 메인 스레드 |
| 진행도에 매달린 파생값 수십 개 | `CardFxSkia.tsx` 약 45개, `MissedSkia.tsx` 약 40개 | 확인 | 총격 중에도 `MissedSkia` 파생값이 함께 계산된다(`missFrame(1)`). 불티·원뿔은 매 프레임 `Skia.Path.Make()` (`:159-204`). 개별 비용은 작다(추측) |
| 웹은 Reanimated 워클릿·Skia 그리기·three.js 가 모두 메인 스레드 | 플랫폼 성질 | 확인 | 웹이 네이티브보다 먼저 버벅인다 |
| 일반 화질(RN Animated)이 웹에서 JS 구동 | `PlayedCardSpotlight.tsx:78` `NATIVE_DRIVER = Platform.OS !== 'web'`, `GunshotFx.tsx` 뷰 약 30개 | 확인 | 웹에서는 "일반"도 공짜가 아니다 |
| `measureInWindow` 두 번 | `PlayedCardSpotlight.tsx:457, 1120-1123` | 확인 | 비동기라 끊김보다는 한 프레임 늦음. 웹은 강제 레이아웃 한 번. 작다(추측) |
| 로그 파싱 `pickSpotlights` | `PlayedCardSpotlight.tsx:243` | 확인 | 로그 꼬리만 본다. 작다 |
| 효과음 | `sfx.ts:84-99` 판 들어올 때 9개 미리 생성, `:102-116` 재생은 가벼움 | 확인 | 원인 아님으로 본다 |

### 처음 한 번만 (첫 발이 특히 끊기는 경우)

| 원인 | 근거 | 구분 |
|---|---|---|
| 웹 CanvasKit(약 3MB wasm) 받기·컴파일이 판 시작 직후 진행 | `load.ts:26-29`, `PlayedCardSpotlight.tsx:125-127` | 확인. 첫 카드와 겹치면 끊김은 추측 |
| 셰이더 파이프라인 컴파일이 첫 그리기에서 일어남 | `shaders.ts:65` 는 모듈 평가 때 만들기만 한다 | 추측 |
| 빗나감! 그림 디코딩 | `MissedSkia.tsx:62` 레이어가 뜰 때 한 번 | 확인. 레이어가 판 시작에 뜨므로 대개 연출 전에 끝난다 |
| 저장된 화질을 읽기 전에 기본값 `'high'` 로 Skia 를 받기 시작 | `quality.ts:17,20` 저장값은 비동기로 늦게 들어온다 | 확인. "일반" 사용자도 웹에서 CanvasKit 을 받을 수 있다 |

### 3D 테이블

| 항목 | 지금 | 근거 |
|---|---|---|
| 그리기 방식 | `frameloop="demand"` 움직일 때만 | `Table3D.tsx:155`, `Scene.tsx:148` |
| 해상도 | `dpr={[1, 2]}` | `Table3D.tsx:156` |
| 안티앨리어싱 | 기기 등급 high 면 켬 | `device-tier.ts:27-31` |
| 파티클 | 링버퍼 1024 / 256, 프리셋 개수는 등급과 무관 (폭발 90) | `Particles.ts:17-19, 73` |
| 그림자 | 그림자 맵 없음. `contactShadow` 값은 어디서도 안 읽는다 | `types.ts:127` |
| 등급 판정 | 메모리·코어 수로 low/high 둘 | `device-tier.ts:14-25` |

쉬는 동안 3D 는 그리지 않는다. 문제는 카드를 낼 때 3D(카드 날기·뱅 줄기·카메라 punch)와 2D 연출이 **동시에** 돈다는 것이다.

## 3단계 설계

이름은 `low` · `mid` · `high`, 화면 글자는 **가볍게 · 보통 · 세밀** 로 한다. 시안 틀(`card-fx-prototypes/_kit.js`)의 저·중·고와 같은 구분이다.

| 항목 | 저 (가볍게) | 중 (보통) | 고 (세밀) |
|---|---|---|---|
| 그리는 수단 | RN Animated (지금의 "일반") | Skia | Skia |
| 웹 CanvasKit 받기 | 안 받음 | 받음 | 받음 |
| 입자 수 (시안 비율) | 25% | 55% | 100% |
| 뱅! 불티 (지금 18) | — (RN 불티 14 → 4) | 10 | 18 |
| 뱅! RN 연기 덩이 (지금 9) | 3 | — | — |
| 화약 연기 셰이더 | 없음 | 3옥타브, 총구 둘레 사각형 | 5옥타브, 총구 둘레 사각형 |
| BlurMask (섬광·불티·고리) | 없음 | 없음 (그라데이션만) | 있음 |
| 방사 그라데이션 (불덩이·비네트) | 없음 (단색 원) | 있음 | 있음 |
| 화면 번쩍 | 없음 | 있음 (약하게) | 있음 |
| 화면·카드 흔들림 | 없음 | 절반 | 그대로 |
| 슬로모션 확대 | 없음 (카드 반동만) | 있음 | 있음 |
| 빗나감! 그림 조각내기 | 없음 (빗나감! 연출 없음 또는 RN 스침) | 조각내기, 빈자리는 단색으로 메움 | 조각내기 + 미리 흐린 그림으로 메움 |
| 빗나감! 공기 고리 | — | 1개 | 3개 |
| 3D `dpr` | 1 | [1, 1.5] | [1, 2] |
| 3D 안티앨리어싱 | 끔 | 기기 등급 따름 | 켬 |
| 3D 파티클 개수 배율 | 0.25 | 0.55 | 1 |
| 3D 카메라 punch·shake | 끔 | 절반 | 그대로 |

메모

- 저는 지금 "일반"과 같은 길(RN Animated)이다. 웹에서는 JS 구동이므로 입자 수를 줄이는 것이 효과가 있다
- 중의 핵심은 **블러 없음 + 셰이더 가볍게** 다. 모양은 고와 거의 같다
- 3D `dpr`·안티앨리어싱은 GL 컨텍스트를 만들 때 정해진다. 판 도중 바꾸면 다음 판부터 적용한다고 적는다 (`Canvas` 에 `key` 를 줘서 다시 만들면 WebGL 컨텍스트가 하나 더 생기므로 판 도중 재생성은 피한다)
- 흔들림 끔은 "움직임 줄이기"(접근성)와도 맞는다. 나중에 OS 설정 `reduceMotion` 을 읽어 흔들림만 따로 끌 수도 있다

### 단계 값을 한곳에

`src/game/ui/fx/fx-profile.ts` 에 순수 표를 둔다. Skia·RN·3D 가 모두 이 표만 읽는다.

```ts
export type FxLevel = 'low' | 'mid' | 'high';

export type FxProfile = {
  skia: boolean;          // false 면 RN Animated
  particles: number;      // 0.25 | 0.55 | 1
  smokeOctaves: 0 | 3 | 5;
  blur: boolean;
  gradients: boolean;
  screenFlash: number;    // 배율
  shake: number;          // 배율 (카드·카메라 공통)
  slowZoom: boolean;
  missedPieces: boolean;
  table: { dpr: [number, number]; antialias: boolean | 'tier' };
};

export const FX_PROFILE: Record<FxLevel, FxProfile> = { … };
```

Skia 쪽은 레이어가 판마다 하나라 `profile` 을 일반 prop 으로 넘기면 된다(바뀔 때만 다시 렌더).
진행도마다 읽어야 하는 배율(`shake`, 확대)은 `ShotGeom` 에 숫자 필드로 넣어 워클릿이 읽게 한다.

### 자동 선택

설정의 기본값을 `auto` 로 두고, 실제 단계는 따로 고른다.

1. **처음 값은 기기 등급으로.** 이미 있는 `getDeviceTier()` (`device-tier.ts:14`)를 쓴다. low → 저, high → 중.
   고는 사용자가 고르거나 아래 측정이 통과했을 때만
2. **판 시작 후 첫 연출 두세 번을 잰다.** 연출이 도는 동안 `requestAnimationFrame` 간격(웹) 또는
   Reanimated `useFrameCallback` 의 `timeSincePreviousFrame`(네이티브 UI 스레드)을 모은다
3. **내리기만 한다.** 연출 중 p95 > 25ms 이거나 33ms 넘는 프레임이 10% 넘으면 한 단계 내리고,
   한 번만 "연출을 '보통'으로 낮췄다" 짧은 안내를 띄운다. 자동으로 올리지는 않는다 (오르내림 반복 방지)
4. 판 도중 단계를 내려도 그 연출은 시작할 때 정한 화질로 끝까지 간다 (지금도 `PlayedCardSpotlight.tsx:414` 가 그렇게 한다)
5. 자동이 내린 결과는 `bang.fx.autoLevel` 에 기억해, 다음 실행에서 거기서 시작한다

AI 배속(`fxPacing.timeScale`)이 4배를 넘는 검증용 배속에서는 측정을 건너뛴다. 연출이 짧아 표본이 안 된다.

### 저장 키 이전

키는 그대로 `bang.fx.quality` 를 쓰고 읽을 때 옛 값을 바꾼다. 옛 앱으로 돌아가도 깨지지 않게 옛 값은 지우지 않는다.

| 저장된 값 | 읽은 뒤 |
|---|---|
| 없음 | `auto` |
| `'high'` | `high` (사용자가 고른 적이 없어도 지금 기본이 high 라 그대로 둔다) |
| `'normal'` | `low` |
| `'auto' \| 'low' \| 'mid'` | 그대로 |
| 그 밖 | `auto` |

```ts
export type FxQuality = 'auto' | FxLevel;
const LEGACY: Record<string, FxQuality> = { normal: 'low' };
```

함께 고칠 것: 저장값을 읽기 전에는 Skia 를 받지 않는다. 스토어에 `ready` 를 두고 `useFxStage`·`useFxQuality` 의
`loadSkiaFx()` 를 `ready && level !== 'low'` 일 때만 부른다 (지금 `quality.ts:17` 기본 `'high'` 문제).

`'high'`/`'normal'` 을 직접 비교하는 곳은 셋이다. 모두 `profile.skia` 로 바꾼다.

- `PlayedCardSpotlight.tsx:124-131` (`useFxStage`)
- `QualityPicker.tsx:21-27`
- `codex/CodexDetail.tsx:115-118`

### 설정 UI

- `InkSegmented` 에 4칸: **자동 · 가볍게 · 보통 · 세밀** (`QualityPicker.tsx:15-18`)
- 설명(`qualityHint`)은 단계마다 한 줄. 자동이면 지금 고른 단계를 함께 보인다. 예: "기기에 맞춰 고른다. 지금은 보통."
- 첫 화면 요약(`SettingsSheet.tsx:33-39`)은 "연출 자동(보통)"처럼
- 3D 해상도처럼 다음 판부터 바뀌는 항목이 있으면 설명 끝에 "테이블 해상도는 다음 판부터" 를 붙인다
- 칸이 넷이면 좁은 폰에서 넘칠 수 있다. 칸 안쪽 여백(`QualityPicker.tsx:81` `paddingHorizontal: 16`)을 줄이거나 두 줄로

### 바꿔야 할 파일

| 파일 | 할 일 |
|---|---|
| `src/game/ui/fx/fx-profile.ts` (새) | 단계 표, `resolveLevel(quality, tier, autoLevel)` |
| `src/game/ui/fx/quality.ts` | 타입 넓히기, 옛 값 이전, `ready`, `autoLevel` |
| `src/game/ui/fx/frame-meter.ts` (새) | 연출 중 프레임 간격 모으기. 개발 측정과 자동 선택이 같이 쓴다 |
| `src/game/ui/QualityPicker.tsx` | 칸·설명, Skia 미리 받기 조건 |
| `src/game/ui/settings/SettingsSheet.tsx` | 요약 글 |
| `src/game/ui/PlayedCardSpotlight.tsx` | `useFxStage` 단계 판정, 레이어 `memo`, 크기를 `geom` 으로, profile 전달 |
| `src/game/ui/fx/skia/CardFxSkia.tsx` | `onSize` 제거, 연기 사각형 한정, 불티 수·블러·그라데이션 토글 |
| `src/game/ui/fx/skia/shaders.ts` | 옥타브 수(3/5)용 셰이더 두 벌 또는 `u_oct` 유니폼, 모양이 0 이면 일찍 끝내기 |
| `src/game/ui/fx/skia/MissedSkia.tsx` | 흐린 그림을 한 번만 만들기(오프스크린 스냅샷), 중에서 단색 메움, 고리 수 |
| `src/game/ui/fx/skia/timeline.ts` | `ShotGeom` 에 `shakeK`, `zoomK` (워클릿이 읽는 배율) |
| `src/game/ui/fx/GunshotFx.tsx` | 저 단계 입자 수 줄이기 |
| `src/game/ui/codex/CodexDetail.tsx` | 화질 비교를 profile 로 |
| `src/game/table3d/overlay/Overlay3D.tsx` | 앵커 구독을 필요한 값만 고르게, `PlayedCardSpotlight` 를 앵커 변화에서 떼기 |
| `src/game/table3d/core/device-tier.ts`, `core/types.ts` | `FxBudget` 에 `dpr`, `particleScale`, `shake`. 안 쓰는 `contactShadow` 정리 |
| `src/game/table3d/Table3D.tsx` | `dpr`·안티앨리어싱을 budget 에서 |
| `src/game/table3d/scene/Particles.ts` | `spawn` 개수에 배율 |
| `src/game/table3d/scene/CameraRig.ts` | punch·shake 세기에 배율 |
| `docs/card-fx.md` | "구조"의 quality 설명, 화질 3단계 표 링크 |

`src/game/table3d/` 는 경계 규칙 대상(`engine/`·`data/`·`modifiers/`·`ai/`)이 아니지만, `fx-profile.ts` 는 React 없이 쓰면 테스트하기 쉽다.

### 작업 순서

1. **재는 도구부터.** `frame-meter.ts` 와 아래 스니펫으로 지금 값을 적어 둔다 (고 / 일반 / `?flat=1`)
2. **단계와 상관없는 고침.** 위 3가지 + `CardFxSkiaLayer` `memo` + 저장값 읽기 전 Skia 안 받기. 다시 잰다
3. 여기서 충분히 좋아졌으면 4 이후는 작게 해도 된다
4. `fx-profile.ts` 와 `quality.ts` 이전 (단위 테스트: 옛 값 → 새 값, 표의 단조성 — 고가 중보다 적게 켜는 항목이 없음)
5. Skia 쪽에 profile 연결 (중 단계). `?fxloop=1&q=mid` 처럼 반복 모드에서 단계를 고를 수 있게
6. RN 쪽(저) 입자 줄이기
7. 3D budget 연결
8. 자동 선택
9. 설정 UI, `docs/card-fx.md` 고치기
10. `npm test && npm run typecheck`, `npx eslint src/game/ui src/game/table3d`. 규칙은 안 건드리므로 시뮬레이터는 생략

## 재는 법

### 웹

**Performance 패널**

1. 개발 서버에서 `/game/…?fxloop=1` (뱅! 3초마다), `?fxloop=missed` (빗나감!)
2. DevTools → Performance → CPU 4x slowdown → 녹화 10초
3. 볼 곳: Frames 줄의 빨간·노란 프레임, Main 줄의 긴 작업(50ms 넘는 회색 삼각형), GPU 줄
4. Main 에서 `Overlay3D` · `PlayedCardSpotlight` 렌더가 연출 동안 몇 번 나오는지. React DevTools Profiler 의 "Highlight updates" 로도 보인다
5. 비교 짝: `?fxloop=1` 과 `?fxloop=1&flat=1` (3D 끔), 고 / 일반

브라우저 패널이 가려져 있으면 `requestAnimationFrame` 이 멈춘다 (`docs/card-fx.md` "함정"). 보이는 상태에서 잰다.

**콘솔 스니펫: rAF 간격 기록**

`?fxloop=1` 을 켠 채로 콘솔에 붙인다. 15초 동안 프레임 간격을 모아 표로 보인다.

```js
(() => {
  const gaps = [];
  let last = performance.now();
  let on = true;
  const tick = (now) => {
    gaps.push(now - last);
    last = now;
    if (on) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const longs = [];
  const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longs.push(Math.round(e.duration))));
  try { po.observe({ type: 'longtask', buffered: false }); } catch {}
  setTimeout(() => {
    on = false;
    po.disconnect();
    const s = gaps.slice(1).sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1);
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    console.table({
      frames: s.length,
      fps: (1000 / avg).toFixed(1),
      p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s.at(-1).toFixed(1),
      over25ms: s.filter((g) => g > 25).length,
      over50ms: s.filter((g) => g > 50).length,
      longTasks: longs.join(','),
    });
  }, 15000);
})();
```

연출 구간만 보고 싶으면 `__shot.start()` 직전·직후에 `performance.mark('fx')` 를 찍고 그 사이 간격만 거른다.
`?fxloop=hold` 로 진행도를 멈추면 파생값이 안 바뀌어 다시 그리지 않으므로, 셰이더 비용은 멈춤이 아니라 반복으로 잰다.

**GPU 만 따로**: DevTools → Rendering → Frame Rendering Stats. 연기 셰이더 한정 전후를 이것으로 비교한다.

### 네이티브

- **Release 빌드에서 잰다.** 개발 빌드는 JS 가 몇 배 느리다. `npx expo run:ios --configuration Release`
- 개발 메뉴 **Perf Monitor**: UI·JS 프레임을 따로 보인다. 카드 낼 때 JS 가 떨어지면 고침 2, UI 가 떨어지면 고침 1·3 쪽이다
- iOS: Xcode Instruments 의 **Animation Hitches**, **Metal System Trace** (GPU 시간), **Time Profiler** (JS·UI 스레드)
- Android: `adb shell dumpsys gfxinfo <패키지> framestats`, Perfetto
- 앱 안에서: `frame-meter.ts` 가 Reanimated `useFrameCallback` 의 `timeSincePreviousFrame`(UI 스레드)과
  JS 쪽 `requestAnimationFrame` 간격(JS 스레드)을 함께 모아 연출이 끝날 때 p50·p95·최대를 로그로 남긴다.
  개발 모드에서 `globalThis.__fxMeter` 로 꺼내 본다. 자동 선택도 이 값을 쓴다
- 네이티브에는 주소창이 없으므로 반복 연출은 도감(`CardFxPreview`, `PlayedCardSpotlight.tsx:360`)에서 같은 카드를 여러 번 돌려 잰다

### 기록할 표

| 경우 | 플랫폼 | p50 | p95 | 33ms 넘는 프레임 | 비고 |
|---|---|---|---|---|---|
| 고 (지금) | 웹 / iOS / Android | | | | |
| 고 + 고침 3가지 | | | | | |
| 중 | | | | | |
| 저 | | | | | |
| 고, `?flat=1` | 웹 | | | | 3D 몫 가르기 |
