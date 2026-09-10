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

카드 일러스트는 dV Giochi 의 저작물이다. **저장소에 커밋하지 않는다.**

- `assets-source/`, `assets/cards/`, `assets/board/`, `reference/sc2-arcade/images/` 는
  전부 `.gitignore` 로 막혀 있다. 이 규칙을 풀지 마라
- 그림이 없어도 앱은 정상 동작해야 한다. `src/game/ui/card-art.ts` 가 `require.context` 로
  폴더를 읽고, 비어 있으면 도형·타이포 카드로 되돌아간다
- 새 그림을 붙일 때도 파일을 하나하나 `require` 하지 마라. 없을 때 번들이 깨진다

자세한 것은 `docs/assets.md`.

## 한국어

로그와 UI 문구는 한국어다. 조사는 `engine/josa.ts` 로 받침에 맞춰 붙인다.
`이(가)` 같은 표기를 남기지 않는다.

## 확인

```bash
npm test && npm run typecheck
npm run simulate -- --games 100 --players 7
```

규칙을 건드렸으면 시뮬레이터까지 돌린다. 테스트가 놓친 것을 여러 번 잡아냈다.
