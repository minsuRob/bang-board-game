# 확장판 추가 플레이북

하이 눈 이벤트 덱과 프로모 캐릭터(엉클 윌·조니 키시)를 붙이면서 만든 틀과, 막혔던 곳을 모았다.
다른 확장판(닷지 시티 / 한줌의 카드 / 와일드 웨스트 쇼 / 골드러시 / 그림자의 계곡)을 붙일 때 이 순서를 따른다.
참고 커밋은 `3a2b222` 다.

새 세션에 맡길 때는 아래 "프롬프트" 절을 그대로 붙여 넣고 `<확장판>` 만 바꾼다.

---

## 프롬프트

```markdown
# BANG! 확장판 추가: <확장판 이름>

AGENTS.md 와 docs/expansion-playbook.md 를 먼저 읽고 그 규칙을 지킨다.
하이 눈 확장판과 프로모 캐릭터(엉클 윌·조니 키시)가 이미 붙어 있다. 같은 틀로 <확장판>을 붙인다.
플레이북의 0~8 단계를 순서대로 하고, 0단계의 범위 확인이 끝나기 전에는 코드를 쓰지 않는다.
```

---

## 0. 범위부터 정한다 (코드 쓰기 전, 계획 모드)

<확장판>이 무엇을 새로 들여오는지 분류하고, 무엇을 할지 사용자에게 먼저 묻는다.

- **캐릭터만 추가**: 하이 눈 프로모와 같은 틀이다. 가장 쉽다.
- **이벤트 덱**: 하이 눈과 같은 틀이다. `EventState`, `revealEvent`, 마지막 고정 카드를 쓴다.
  공개 시점은 덱 스펙의 `revealOn`(`data/events.ts`)으로 정한다. 보안관 차례마다(하이 눈) 또는
  어떤 카드를 낼 때(와일드 웨스트 쇼의 역마차·웰스 파고). 원본 룰에서 공개 시점을 꼭 확인한다.
- **새 카드 종류**: 닷지 시티 초록 카드처럼 '다음 차례부터 쓰는' 장비 같은 것이다. `CardDef.category` 를 넓히고 legal/play 를 고쳐야 한다.
- **새 자원·상태**: 골드러시의 금덩이·상점 같은 것이다. `GameState` 를 넓혀야 해서 가장 크고, JSON 왕복이 필수다.

분류 결과, 카드 목록, 룰이 애매한 항목, 한글 이름 후보를 표로 보여 주고 AskUserQuestion 으로 확인한다.

## 1. 원본 자료를 모은다

- **카드 목록과 그림**: https://bang.dvgiochi.com/cardslist.php?id=N
  - id=5 는 하이 눈과 한줌의 카드, id=2 는 불릿 판 전용 카드다. 다른 확장판은 id 를 바꿔 가며 찾는다.
  - 그림 경로는 `content/<id>/cards/*.png` 다.
- **카드 원문(영/이)**: 받은 그림에서 직접 읽는다. 기억으로 쓰지 않는다.
- **원본 SC2 맵의 판정**:
  - `reference/sc2-arcade/analysis/new_strings_by_version.json` 의 패치노트를 본다.
  - `docs/edge-cases.md` 의 "부록: 범위 밖 확장판 케이스" 에 원문이 이미 모여 있다. 이것을 본문 EC 번호로 옮긴다.
  - EC 번호는 마지막 번호 다음부터 매긴다.
- **이름 표기**: ko 는 원본 맵 패치노트를 따르고, en 은 공식 영문판, it 는 dV Giochi 원판 이름을 쓴다. `content/{ko,en,it}` 에 넣는다. 없으면 음차 후보를 들고 사용자에게 묻는다.

## 2. 그림

- 받은 파일은 `assets-source/cards/<폴더>/{id}.png` 에 둔다.
  - 파일 이름은 `src/game/data` 의 id 와 정확히 같아야 한다.
  - 받기 전에 파일명·출처·크기를 알린다.
- `assets-source/cards/manifest.json` 에 `{ url, bytes }` 를 적는다.
- 새 폴더가 필요하면 `scripts/install-art.mjs` 의 매핑과 `src/game/ui/card-art.ts` 의 조회 함수를 추가한다.
  - 그림을 하나하나 `require` 하지 않는다. `require.context` 만 쓴다.
- 3D 에서 쓰는 그림이면 `src/game/ui/art-preload.ts` 의 `TEXTURE_KEY` 에 넣는다.
- 캐릭터 스캔이 250×389 면 `SCAN_PORTRAIT` 크롭이 그대로 맞는다. 그래도 `sips` 로 크기를 확인하고, 초상 크롭은 눈으로 본다.
- `node scripts/install-art.mjs` 를 돌린 뒤, 생긴 `assets/cards/**` 그림을 데이터와 같은 커밋에 넣는다.
  빼먹으면 다른 폴더·배포에서는 새 그림이 없다. `npm run art:check` 에서 빠진 그림이 0 이 되는지 본다.

## 3. 데이터

- `Expansion` 유니언(`src/game/data/types.ts`)에 새 값을 추가한다.
- 캐릭터:
  - `CharacterId` 에 추가하고, `CHARACTERS` 에는 `expansion` 을 달아 **목록 맨 끝**에 붙인다. 순서를 바꾸면 기본판 시드 결과가 바뀐다.
  - 드래프트 후보는 `charactersFor(expansions)` 가 거른다.
- `Record<CharacterId, …>` 로 된 맵(`CHARACTER_MODIFIERS`, `ai/draft.ts` 의 `CHARACTER_VALUE` 등)은 빠진 곳을 typecheck 가 다 찾아 준다.
- 이벤트 덱이면 `cards.highnoon.ts` 를 본뜬다. 카드를 섞고 마지막 카드를 고정하는 일은 `setup.ts` 에서 한다.
- 하이 눈과 동시에 켤 수 있는지 정한다. 이벤트 덱이 둘이 되는 경우는 원작 룰을 확인한다.

## 4. 엔진 — Modifier 훅으로만

- **능력 파일**: 캐릭터·이벤트 능력은 `src/game/modifiers/**` 에 하나씩 만들고 등록소에 넣는다. 엔진 코어에 `if (character === …)` 를 넣지 않는다.
- **새 훅**: 맞는 훅이 없으면 `engine/modifier.ts` 에 새로 만든다.
  - 디스패처는 `engine/hooks.ts` 에 두고, 엔진 한 곳에서 부른다.
  - 예시: `playAnyAs`(엉클 윌), `onPutInPlay`(조니 키시)
- **새 프레임**: 새 효과가 연쇄를 만들면 `engine/types.ts` 에 `Frame` 을 추가한다.
  - 해결기는 `frames/*.ts` 에 두고 `frames/index.ts` 에 연결한다.
  - 프레임에는 JSON 값만 담는다.
- **합법 수**: `engine/legal.ts` 한 곳이 정한다. 리듀서는 합법 수에 없는 액션을 거부한다.
- **다른 종류로 내는 카드**: 이런 능력이면 `playCard` 로그에 `as` 를 남긴다.
  - 연출(`fx-plan.ts`, `card-fx.ts`), 공격 표시(`attacks.ts`), AI 추론(`belief.ts`)은 모두 `e.as ?? kindOf(e.card)` 로 읽는다.
- **숙취·새로운 신분**: 능력 무효(숙취)와 캐릭터 교체(새로운 신분)는 `getModifiers` 가 알아서 처리한다. 테스트로 확인만 한다.
- **차례당 한 번**: `Player.usedThisTurn` 에 능력 key 를 넣어 막는다.
- **로그 문구**: 엔진은 `LogMsg` 만 남긴다. 문장은 `src/i18n/log/{ko,en,it}.ts` 에 3개 언어로 쓰고, ko 의 조사는 `engine/josa.ts` 로 붙인다.

## 5. UI

- **선택형 능력은 켜고 끄는 모드로 만든다.** 손패 선택지에 그냥 섞으면 사용자가 모르고 쓰게 된다 (엉클 윌 교훈).
  - 상태는 `use-table.ts` 의 `armed` / `arm` 을 쓴다.
  - `ActionBar` 에 켜는 버튼을 두고, Esc 로 끈다.
- **테이블 위 카드·더미에 설명을 붙이려면:**
  - `AnchorProjector.ts` 에서 그 카드의 화면 사각형을 투영한다.
  - `Overlay3D.tsx` 의 `HoverTarget` 에 종류를 더해, 왼쪽 미리보기 자리를 같이 쓴다. `EventHover.tsx` 를 참고한다.
- **props 는 세 곳 모두에 넘긴다**: 2D `Table.tsx`, `TableMobile.tsx`, 3D `Table3D.tsx`.

## 6. AI

- `ai/draft.ts` 에 새 캐릭터 가치를 넣는다.
- 새 카드·능력의 점수는 `ai/policy.ts` 의 `scorePlay` / `scoreRespond` 에 넣는다.
- 카드를 소모하는 능력은 그 카드의 가치를 비용으로 뺀다.

## 7. 테스트와 확인

- **엔진 테스트**: `src/game/engine/__tests__/` 에 확장판 이름으로 파일 하나를 만든다. 틀은 `promo-characters.test.ts` 를 따른다.
  - `helpers.ts` 의 `scenario` / `handCard` / `reduce` / `logged` / `totalCards` / `beginTurn` 을 쓴다.
  - 반드시 다룰 것:
    - 능력마다 성립하는 경우와 안 되는 경우
    - 숙취·수갑·설교·목사·유령도시와 겹칠 때
    - 카드 80장이 보존되는지
    - JSON 왕복
    - 기본판에서는 새 캐릭터가 나오지 않는지
- **개수 검증**: `data.test.ts` 의 개수를 새로 맞춘다.
- **시뮬레이터**: `scripts/simulate.ts` 에 확장판 플래그가 없으면 추가한다. 아래를 돌려 불변식 위반이 0 인지 확인한다.

  ```bash
  npm test && npm run typecheck
  npm run simulate -- --games 100 --players 7
  npm run simulate -- --games 200 --players 7 --<확장판 플래그>
  # 규칙·불변식만 빠르게: 작업자 병렬 + 역할 추정 측정 끔 + 중·하 난이도 (수천 판이 몇십 초)
  npm run simulate -- --games 2000 --players 7 --<확장판 플래그> --fast --events
  ```

  - `--events` 는 이벤트마다 공개 횟수와 그 이벤트에서 유난히 많이 나온 로그를 찍는다.
    "눈에 띄는 로그 없음" 이면 효과가 비어 있는지 확인한다 (손패 공개·채팅처럼 로그 없이 도는 이벤트도 여기 뜬다).
  - `--jobs N` 으로 작업자 수를 정한다 (기본 CPU 수 - 1). 상 난이도는 수읽기가 비싸 병렬로도 몇 배에 그친다.

- **브라우저 확인**:
  - `.claude/launch.json` 에서 비어 있는 포트를 골라 `preview_start` 한다.
  - 새 캐릭터가 내 후보에 나오는 시드를 먼저 스크립트로 찾는다. `createGame` 을 돌려 `draft.offers.p0` 를 본다.
  - `/game/local?players=5&highnoon=1&seed=N` 으로 연다. 새 확장판이면 파라미터를 추가한다.
  - 이벤트는 `&devEvent=<이벤트 id>` 를 붙이면 보안관의 첫 차례부터 걸려 있다 (그 확장판도 저절로 켠다, 웹 개발 모드 전용).
    `&notimer=1` 은 내 차례 제한시간을 끄고, `&auto=1` 은 내 자리까지 AI 가 둔다.
  - 혼자 하는 판의 AI 속도는 8×·16×·32×·최대(100×)까지 있다. 7인 한 판이 최대 배속에서 10초 안팎이다.
  - 창이 숨겨져 있으면 턴 타이머가 먼저 끝난다. 버튼 클릭과 결과 읽기는 `javascript_tool` 한 번에 묶는다.
  - 1440×900 으로 키워야 왼쪽 미리보기 자리가 생긴다.

## 8. 커밋

- **내 파일만 담는다**: 다른 세션이 같은 폴더에서 동시에 작업할 수 있다. `git status` 로 내 파일만 고르고, 섞인 파일은 내 hunk 만 `git apply --cached` 로 담는다.
- **담은 것만 따로 확인한다**: 담은 내용을 임시 폴더에 풀어(`git checkout-index`, `node_modules` 는 심볼릭 링크) typecheck 와 test 를 돌린다.
  - `expo-env.d.ts` 처럼 무시되는 생성 파일은 같이 복사해야 typecheck 가 된다.
- **커밋 메시지**: 한국어 한 줄 제목, **빈 줄**, 본문 목록.
- **푸시**: 사용자가 말할 때만 한다.
