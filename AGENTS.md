# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

SDK 56 이하의 기억으로 API 를 쓰면 조용히 틀린다.

---

# 이 저장소의 규칙

## 경계

`src/game/engine/` · `src/game/data/` · `src/game/modifiers/` · `src/game/ai/` 는
**순수 TypeScript** 다. 다음을 import 하지 않는다.

- react, react-native, react-dom
- expo, expo-router
- zustand
- firebase, @react-native-async-storage

`@/` 별칭도 쓰지 않는다 (번들러 없이 돌아야 한다). 전역 `Math.random()` 도 금지다.
난수는 `engine/rng.ts` 의 시드 RNG 만 쓴다.

`src/game/engine/__tests__/boundary.test.ts` 가 이 규칙을 강제한다.

## 엔진

- 리듀서는 순수 함수다. `(state, action) => state`
- `GameState` 는 JSON 으로 완전히 왕복 가능해야 한다. 함수·클래스·Map·Set 금지
- 캐릭터 능력은 `Modifier` 훅으로만 붙인다. 엔진 코어에 `if (character === '...')` 를 넣지 않는다
- 새 규칙을 넣기 전에 `docs/edge-cases.md` 에서 해당 케이스를 먼저 찾아본다

## 카드 아트

카드 일러스트(dV Giochi 저작물)는 **`assets/cards/`, `assets/board/` 에 커밋한다.**
어느 폴더·컴퓨터에서 받아도 같은 그림이 나오게 하려는 것이다 (2026-10 결정).

- 앱이 쓰는 그림은 git 에 있는 것이 기준이다. 그림을 바꾸면 그 파일도 같은 커밋에 넣는다
- `assets-source/`(원본 모음)와 `reference/sc2-arcade/images/` 는 여전히 `.gitignore` 다.
  앱에는 `assets/` 사본만 있으면 된다
- 공개 배포 전에는 저작권을 다시 검토한다
- 그림이 없어도 앱은 정상 동작해야 한다. `src/game/ui/card-art.ts` 가 `require.context` 로
  폴더를 읽고, 비어 있으면 도형·타이포 카드로 되돌아간다
- 새 그림을 붙일 때도 파일을 하나하나 `require` 하지 마라. 없을 때 번들이 깨진다
- `npm run art:check` 로 게임 데이터에 필요한 그림 중 빠진 것을 본다

자세한 것은 `docs/assets.md`.

## 카드 연출

카드를 낼 때 가운데에 뜨는 연출(뱅! 총격, 빗나감! 스침)은 `docs/card-fx.md` 의 순서로 만든다.
원본 그림 확인 → 캔버스 시안 여러 개(`docs/card-fx-prototypes/`) → Skia 고화질 → 장면별로 멈춰 확인.
Skia 캔버스는 판마다 하나만 띄운다 (WebGL 컨텍스트가 넘치면 3D 테이블이 끊긴다).

## 첫 화면

첫 화면은 정오의 큰길 수채 바탕 위에 메뉴를 카드 부채로 펼친다. 바탕 그림은 시안 HTML 에서
그려 뽑은 `assets/board/menu-high-noon.jpg` 다. 고치기 전에 `docs/menu-design.md` 를 본다.

## 확장판

새 확장판(캐릭터·이벤트·카드)을 붙일 때는 `docs/expansion-playbook.md` 의 순서를 따른다.
범위 확인 → 원본 자료 → 그림 → 데이터 → Modifier 훅 → UI → AI → 테스트·시뮬레이터.

## 한국어

로그와 UI 문구는 한국어다. 조사는 `engine/josa.ts` 로 받침에 맞춰 붙인다.
`이(가)` 같은 표기를 남기지 않는다.

## 확인

```bash
npm test && npm run typecheck
npm run simulate -- --games 100 --players 7
```

규칙을 건드렸으면 시뮬레이터까지 돌린다. 테스트가 놓친 것을 여러 번 잡아냈다.
