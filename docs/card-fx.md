# 카드 연출 만들기

누가 카드를 내면 테이블 가운데에 그 카드가 크게 뜨고(스포트라이트), 연출이 붙은 카드는
그 위에서 소리와 화면 효과가 터진다. 지금 붙어 있는 것은 **뱅!**(총격)과 **빗나감!**(슬로모션 스침)이다.

이 문서는 새 카드 연출을 같은 방식으로 만드는 순서와, 만들면서 밟았던 함정을 적는다.

## 작업 순서

1. **원본 그림부터 본다.** `assets/cards/card/{종류}.png` (저장소에는 없다. `docs/assets.md`).
   연출은 그림 속 장면을 살리는 쪽이 가장 잘 맞았다. 뱅!은 그림 속 권총 총구에서 불을 뿜고,
   빗나감!은 그림 속 인물과 모자를 조각내 움직인다.
2. **좌표를 잰다.** 그림 위에 격자를 얹어 보고 원본 픽셀(250×389) 좌표를 적는다.

   ```bash
   python3 -c "
   from PIL import Image, ImageDraw
   im=Image.open('assets/cards/card/missed.png').convert('RGB').resize((500,778)); d=ImageDraw.Draw(im)
   for i in range(0,500,25): d.line([(i,0),(i,778)],fill=(255,0,0) if i%50==0 else (0,160,255))
   for j in range(0,778,25): d.line([(0,j),(500,j)],fill=(255,0,0) if j%50==0 else (0,160,255))
   for i in range(0,500,50): d.text((i+2,2),str(i//2),fill=(255,0,0))
   for j in range(0,778,50): d.text((2,j+2),str(j//2),fill=(255,0,0))
   im.save('/tmp/grid.png')"
   ```

3. **시안을 여러 개 만든다.** 브라우저 캔버스로 3~4개를 나란히 돌려 보고 고른다.
   빌드 없이 여는 HTML 한 장이면 충분하다. 예: [`card-fx-prototypes/bang.html`](card-fx-prototypes/bang.html),
   [`card-fx-prototypes/missed.html`](card-fx-prototypes/missed.html).
   - 카드 그림은 저작권 때문에 시안에 넣지 않는다. 인물·모자·총은 단순한 모양으로 흉내 낸다
   - 시안끼리 섞어도 된다 (뱅!은 D 슬로모션 + A 사실풍을 합쳤다)
4. **고화질(Skia)부터 만든다.** 아래 구조에 맞춰 시간표 → 그림 → 연결 순서로.
5. **장면별로 멈춰 확인한다.** `?fxloop=hold` 로 진행도를 고정하고 스크린샷을 찍는다 (아래 "확인").
6. 필요하면 일반 화질(RN Animated) 판을 따로 만든다. 빗나감!은 아직 고화질만 있다.

## 구조

```
src/game/ui/PlayedCardSpotlight.tsx   로그를 읽어 가운데에 카드를 띄우고 연출을 발사한다
src/game/ui/fx/card-fx.ts             카드 종류 → 연출 표 (여기 한 줄 더하면 새 카드)
src/game/ui/fx/GunshotFx.tsx          일반 화질 총격 (RN Animated)
src/game/ui/fx/quality.ts             고화질/일반 설정 (설정 팝업 SettingsSheet, 기기마다 기억)
src/game/ui/fx/skia/load.ts           Skia 늦게 불러오기 (웹은 CanvasKit 먼저)
src/game/ui/fx/skia/timeline.ts       시간표 워클릿. 진행도(0→1) → 그 순간의 모든 값
src/game/ui/fx/skia/CardFxSkia.tsx    고화질 캔버스 (판마다 하나). 총격을 그리고 빗나감 무리를 품는다
src/game/ui/fx/skia/MissedSkia.tsx    빗나감: 원본 그림 조각 움직이기
src/game/ui/fx/skia/ScopeSkia.tsx     조준경: 렌즈 속 시야가 열려 먼 사람을 당긴다 (화면 전체를 덮으므로 캔버스 맨 위)
src/game/ui/fx/skia/MustangSkia.tsx   야생마: 원근 길·말발굽 자국·점선 자리·착지 먼지 (지금 카드 자리를 도려낸다)
src/game/ui/fx/skia/BarrelSkia.tsx    술통: 그림 속 머리 조각이 통 뒤로 숨고, 잉크 총알·별·하트
src/game/ui/fx/skia/GatlingSkia.tsx   기관총: 총구 연사·탄피 (stage 안) + 둘레 자리 여섯 (배경)
src/game/ui/fx/skia/IndiansSkia.tsx   인디언!: 입·함성 고리·깃털 (stage 안) + 둘레 자리 여섯 (배경)
src/game/ui/fx/skia/paths.ts          여러 연출이 함께 쓰는 모양 워클릿 (착지 고리·별·하트·돌린 사각형, 시드 난수표)
src/game/ui/fx/CardFxLabels.tsx       조준경·야생마·술통 글자 (RN, 캔버스 위에 띄운다)
src/game/ui/fx/skia/VolleySkia.tsx    볼캐닉: 그림 속 총구 7연사 섬광·짧은 예광선·사정거리 고리
src/game/ui/fx/skia/CylinderSkia.tsx  스코필드: 카드 옆 큰 실린더가 돌며 장전, 그림 속 실린더로 들어간다
src/game/ui/fx/skia/RangeSkia.tsx     레밍턴: 카드 오른쪽 사격장 과녁 5개, 1~3번을 맞힌다 (배경)
src/game/ui/fx/skia/LaneSkia.tsx      카빈: 원근 사격 레인 4칸 (기댄 카드 모양을 도려낸다, 배경)
src/game/ui/fx/skia/WinchesterSkia.tsx 윈체스터: 야간 녹색 조준경, 렌즈 밖을 어둡게 덮는다
src/game/ui/fx/GunFxLabels.tsx        볼캐닉 카운터·레밍턴 과녁 번호·카빈 띠 번호 (RN, 카드 자리 안)
src/game/ui/fx/WinchesterLabels.tsx   윈체스터 눈금 숫자·"사정거리 5" (RN, 캔버스 위)
src/game/ui/fx/skia/shaders.ts        SkSL 셰이더 (화약 연기 fbm)
src/game/ui/fx/skia/ShotCardWrap.tsx  RN 카드를 캔버스와 같은 값으로 흔들고 확대
src/game/ui/sfx.ts                    효과음 재생 (expo-audio, 플레이어 풀, 음소거·볼륨)
scripts/gen-sfx.mjs                   효과음 합성기 → assets/sfx/*.wav
```

### 시계는 하나

진행도 공유값(`progress`, Reanimated) 하나가 0→1 로 간다. Skia 그림(`useDerivedValue`)과
RN 카드 움직임(`useAnimatedStyle`)이 **같은 시간표 함수**(`shotFrame`, `missFrame`, `cardMotion`)를
같은 값으로 부르므로 서로 어긋날 수 없다. 소리도 진행도를 출발시키는 **같은 JS 틱**에 튼다.
AI 배속(`fxPacing.timeScale`)만큼 전체 길이를 나눈다.

시간표는 `seg(T, a, b)`(구간 안에서 0→1) 와 이징으로 쓴다. 슬로모션은 입자용 시간(`warp`)을
느리게 흘리는 것으로 만든다. 끝(진행도 1)에서는 모든 값이 "아무것도 안 그림"이 되게 한다.

### 캔버스는 판마다 하나

**총격마다 Skia 캔버스를 새로 만들지 마라.** 웹에서 캔버스마다 WebGL 컨텍스트가 생기고,
쌓여서 브라우저 한도(보통 16)를 넘으면 오래된 컨텍스트부터 끊긴다. 3D 테이블이 까맣게 되고
연출도 멈춘다. 그래서 `CardFxSkiaLayer` 를 스포트라이트 레이어에 한 번 띄워 두고, 연출이 시작될 때
카드 자리를 재서(`measureInWindow`) `geom` 공유값에 넣는다. 종류는 `geom.kind`(`FX_GUNSHOT`,
`FX_MISSED`)로 가른다. 쉬는 동안(진행도 0 또는 1)은 아무것도 그리지 않는다.

캔버스는 카드 **위**에 둔다. 아래에 두면 총구 섬광이 카드에 가린다.

### 원본 그림 조각내기 (빗나감!)

`useImage(playingCardArt('missed'))` 로 그림을 받아, 카드와 같은 `cover` 배치로 깐다.

1. 원본 그림 전체
2. 움직일 조각 자리(모자 타원 + 인물 다각형)를 흐린 그림으로 메운다 (`<Blur>`)
3. 인물 조각: `clip` 과 `transform` 을 한 `Group` 에 두면 잘라낸 모양째 움직인다
4. 모자 조각: 같은 방식

끝 장면이 원본 그림과 똑같아지게 짜면(모자가 그림 속 자리로 돌아와 멈춤) RN 카드로 자연스럽게 넘어간다.
그림이 없는 기기에서는 조각 없이 효과만 그린다.

### 소리

녹음 파일 대신 `scripts/gen-sfx.mjs` 가 코드로 합성한다(노이즈·필터·감쇠 조합, 시드 고정).
우리가 만든 소리라 저장소에 넣어도 된다. 새 소리는 함수 하나를 더하고 `SOUNDS` 에 등록한 뒤
`npm run gen:sfx`, `sfx.ts` 의 `SOURCES` 에 한 줄.

## 새 카드 연출 붙이기

1. `card-fx.ts` 의 `CardFx` 에 `visual` 종류를 더하고 `CARD_FX` 에 한 줄
2. `timeline.ts` 에 `FX_…` 상수, 시간표 함수, `cardMotion` 분기
3. `skia/` 에 그림 컴포넌트를 만들어 `CardFxSkia.tsx` 의 `stage` 그룹 안에 넣는다
4. `PlayedCardSpotlight.tsx` 의 `fireHq` 에서 `geom`(종류·초점)을 채우고 소리를 건다
5. 개발용 반복(`fxloop`)에 모드를 하나 더한다

## 확인

웹 미리보기에서 **개발 모드**일 때만 동작한다.

| 주소 | 하는 일 |
|---|---|
| `?fxloop=1` | 뱅! 연출을 3초마다 되풀이 |
| `?fxloop=missed` | 빗나감! 연출을 되풀이 |
| `?fxloop=hold` | 되풀이 없이 `globalThis.__shot` 만 연다 |
| `?fxloop=event` | 하이 눈 이벤트 카드를 돌려 가며 띄운다 |
| `?fxloop=take` | 캣 벌로우·강탈 결과(손패는 뒷면, 장비는 앞면)를 번갈아 띄운다 |
| `?fxloop=<카드 종류>` | 연출이 붙은 그 카드를 3.4초마다 낸다 (예: `scope`, `gatling`). 고화질 설정이어야 한다 |

### 붙은 연출 (고화질만)

| 카드 | 시안 | 길이 | 그림 속 자리 (원본 px) | 소리 |
|---|---|---|---|---|
| 조준경 | A 렌즈 속 당겨 보기 | 2000ms | 대물렌즈 (140,172) | 끼릭 ×2, 거리 줄 때 팅 |
| 야생마 | B 3D 멀어졌다 돌아오기 | 2000ms | — (카드 전체가 움직인다) | 다그닥 ×3, 착지 퉁 |
| 술통 | C 만화 잉크 쏙·핑! | 1500ms | 피격점 (158,186), 머리 조각 (108~182, 118~통 뚜껑 곡선), 메움은 벽 띠 y 100~116 을 늘린다 | 쏙, 퉁 + 피융, 딩 |
| 기관총 | A 쓸어 가는 연사 | 1800ms | 총구 (208,199), 탄피 (172,192) | 연사 15발, 헛도는 딸깍 ×2 |
| 인디언! | A 함성 물결 | 1800ms | 입 (145,237), 깃털 (143,102) | 북 ×3 |
| 볼캐닉 | A 연사 스트로브 | 1500ms | 총구 (195,117) | 마른 총성 ×7 |
| 스코필드 | B 3D 실린더 회전 | 1700ms | 실린더 (108,160) 반지름 21 | 철컥, 딸깍 ×6, 철컥 |
| 레밍턴 | C 사격장 과녁 3개 | 2000ms | 총구 (206,116) | 탕 ×3 + 땡 ×3 |
| 카빈 | B 원근 사격 레인 | 1800ms | — (카드가 아래 모서리 축으로 기댄다) | 철컥, 딸깍 ×4 |
| 윈체스터 | B3 야간 녹색 조준경 | 2000ms | 총구 (46,94) | 철컥, 딸깍 ×5, 고정 딸깍 |

시안 머리 주석의 좌표는 그림을 보지 않고 적은 것이라 틀린 데가 많다 (조준경 렌즈 172,160 → 실제 140,172).
옮길 때는 원본 그림에 격자를 얹어 다시 잰다.

기관총·인디언!의 "다른 사람 자리"는 실제 좌석이 아니라 카드 둘레 타원(시안 카드 폭 92 기준 132×88)이다.

`__shot.progress.value = 0.3` 처럼 넣으면 그 장면에 멈춘다(애니메이션을 덮어쓴다). `__shot.start()` 는 한 번 돌린다.
반복 모드에서 카드가 뜬 직후 값을 고정하면 **실제 카드 위에서** 장면을 볼 수 있다.

```js
// 카드가 뜰 때까지 기다렸다가 0.3 에 멈춘다
const on = () => [...document.querySelectorAll('div')].some(d => d.children.length === 0 && d.textContent.startsWith('연출 시험'));
while (!on()) await new Promise(r => setTimeout(r, 5));
await new Promise(r => setTimeout(r, 150));
__shot.progress.value = 0.3;
```

### 함정

- **브라우저 패널이 가려져 있으면 `requestAnimationFrame` 이 멈춘다.** Reanimated 애니메이션,
  웹의 `onLayout`(ResizeObserver) 가 돌지 않아 "진행도가 0 에서 안 움직인다"처럼 보인다.
  스크린샷이 되는 상태에서 확인할 것
- 스크린샷 한 장에 0.5초 넘게 걸린다. 시간 맞춰 찍지 말고 `hold` 로 멈춰 찍는다
- **웹의 Skia `Canvas` 는 스타일 배열을 펼치지 않는다.** 배열을 넘기면 DOM 에 그대로 들어가 렌더가 깨진다. 한 객체로 준다
- 3D 손패처럼 `GestureDetector` 안의 요소는 웹 `onLayout` 이 창 기준 좌표를 준다. 위치는 `measureInWindow` 로 잰다
- 늦게 받는 값(예: 그림 로딩 여부)을 워클릿에서 쓰면 처음 값에 붙잡힌다. `useDerivedValue(fn, [값])` 으로 의존성을 준다
- **`useDerivedValue` 콜백 본문에서 공유값(`.value`)을 직접 읽어야 한다.** 도우미 워클릿 안에서만 읽으면
  웹 Reanimated 가 구독하지 않아 처음 값(`EMPTY_GEOM`)에 멈춘다. 도우미는 `geom.value` 를 인자로 받게 짠다
- **그림 조각이 떠난 자리는 둘레의 깨끗한 그림을 늘려 메운다** (술통: 머리 바로 위 벽 띠를 아래로 늘림).
  같은 자리 그림을 흐리면 잔상이 남고, 단색·그라데이션은 색을 맞춰도 수채 질감 사이에서 매끈한 면으로 뜬다.
  메움은 옮길 조각만 덮는다. 옆의 다른 그림까지 덮으면 사각형이 드러난다. 마스크 흐림은 `solid`
  (`normal` 은 작은 모양에서 가운데까지 반투명해진다)
- 렌더 중에 ref 를 쓰지 않는다 (`react-hooks/refs` 린트). `useEffect` 안에서 갱신한다
- Skia·expo-audio 처럼 네이티브 패키지를 새로 설치하면 Metro 를 다시 시작한다 ("unknown module" 오류)
- 웹 CanvasKit 은 `postinstall` 이 `public/canvaskit.wasm` 으로 복사한다 (gitignore 됨)

## 검사

```bash
npm test && npm run typecheck
npx eslint src/game/ui
```

규칙을 건드리지 않았으면 시뮬레이터는 생략해도 된다.

## 카드 펼치기 결과 (판정·포커·럼)

판정(술통·감옥·다이너마이트·방울뱀·헬레나 존테로…)·블랙 잭·피요테는 한 장을 펼쳐 무늬 배지와
성공·실패 도장을 찍는다(`RevealSpot`, 규칙은 `JUDGEMENT_RULE`). 포커 판돈 공개와 럼은 여러 장을
한 장씩 뒤집고, 조건에 걸린 카드(에이스·새 무늬)를 띄운 뒤 도장을 찍는다(`GroupRevealSpot`).

펼친 결과는 다음 카드가 끼어들어도 버리지 않고 그 앞에 줄 세운다(`isFlipResult`).
이벤트가 공개되자마자 판정이 돌고 AI 가 곧바로 카드를 내면 판정 연출이 통째로 사라졌기 때문이다.
`?fxloop=reveal` 로 모든 경우를 돌려 볼 수 있다.
