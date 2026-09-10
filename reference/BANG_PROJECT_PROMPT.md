# 보드게임 뱅!(BANG!) 리메이크 — 신규 프로젝트 설계

> 아래 `---` 사이 전체를 새 프로젝트 세션에 그대로 붙여넣으면 된다.

## 사전 준비 (붙여넣기 전에 셸에서 1회)

```bash
mkdir -p ~/workspace/Personal/bang-remake && cd ~/workspace/Personal/bang-remake
git init
mkdir -p reference
cp -R ~/Downloads/sc2arcade_bang_86515 reference/sc2-arcade
```

이후 프롬프트 안의 모든 경로는 **프로젝트 루트 기준 상대경로**다.

---

# 프로젝트: 보드게임 뱅!(BANG!) 웹/모바일 리메이크

보드게임 **뱅!(BANG!, dV Giochi)** 을 React Native Web 기반으로 구현한다.
참고 구현체는 SC2 아케이드 맵 **"뱅!"** (region 3 / bnetId 86515, 제작자 WillyTheKid,
2014-08-11 최초 게시 ~ 2025-01-30 v0.572, 평점 3.80 / 리뷰 382건)이며,
그 맵에서 추출 가능한 공개 메타데이터 일체가 `reference/sc2-arcade/` 에 들어 있다.

**맵 아카이브(.SC2Map)는 없다.** 제작자가 SC2Arcade의 다운로드 허용 설정을 꺼두어
아카이브 해시가 비공개다. 따라서 원본 트리거/갤럭시 스크립트는 존재하지 않으며,
게임 로직은 공개된 보드게임 룰과 아래 참고 자료로부터 새로 작성한다.
(룰 자체는 저작권 보호 대상이 아니다. 다만 참고 이미지의 카드 일러스트는
dV Giochi의 저작물이므로 **최종 배포물에는 절대 포함하지 않는다.** 개발 중 참조만 한다.)

---

## 1. 기술 스택

기존 프로젝트 `naruto-random-defense`와 동일 계열로 맞춘다. 단 3D 레이어는 뺀다.

| 항목 | 버전/선택 |
|---|---|
| Expo SDK | 57 (expo-router 57) |
| React / React Native | 19.2.3 / 0.86.3 |
| react-native-web | 0.21 |
| TypeScript | 6, `strict: true` |
| 상태관리 | zustand 5 |
| 테스트 | vitest 4 |
| 애니메이션 | react-native-reanimated 4 |
| 렌더링 | **2D만.** three / @react-three/fiber 쓰지 않는다 |

플랫폼 우선순위는 **웹 먼저**, 이후 Expo로 iOS/Android 확장.

### 반드시 지킬 것

`AGENTS.md`에 다음을 넣고 지킨다:

```
# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/
before writing any code.
```

SDK 56 이하의 기억으로 API를 쓰면 조용히 틀린다. 코드를 쓰기 전에 해당 버전 문서를 읽어라.

---

## 2. 참고 자료 — `reference/sc2-arcade/`

### 2.1 카드/캐릭터 도감 이미지 — **가장 중요**

게임 내 도감을 그대로 캡처한 800×600 JPEG다. **Read 툴로 직접 열어서 읽어라.**
같은 도감이 화질 다르게 두 벌 있으니 **파일 크기가 큰 쪽(고화질본)을 써라.**

| 경로 | 내용 |
|---|---|
| `reference/sc2-arcade/images/howtoplay_058e97e1463e.jpg` | **기본 플레잉 카드 22종** (238KB, 고화질본) |
| `reference/sc2-arcade/images/howtoplay_5a3151765feb.jpg` | **기본 캐릭터 16종** (219KB, 고화질본) |
| `reference/sc2-arcade/images/howtoplay_f5c505960482.jpg` | **하이 눈 확장 15종** (216KB, 고화질본) |
| `reference/sc2-arcade/images/howtoplay_8d3e2f235798.jpg` | **카드 심벌 마크 범례** — 효과 표기법의 원자 단위 |
| `reference/sc2-arcade/images/howtoplay_671dc0586240.jpg` | **역할 4종 설명 + 7인 역할 카드 구성** |
| `reference/sc2-arcade/images/howtoplay_67172d37d25e.jpg` | 카드 도감 저화질본 (참고용) |
| `reference/sc2-arcade/images/howtoplay_d55382c5d92b.jpg` | 캐릭터 도감 저화질본 (참고용) |
| `reference/sc2-arcade/images/howtoplay_9bb2d24fb2b0.jpg` | 하이 눈 저화질본 (참고용) |

UI 레이아웃 참고용 스크린샷:

| 경로 | 내용 |
|---|---|
| `reference/sc2-arcade/images/screenshot_25aad3a471f5.jpg` | 원형 테이블 레이아웃 (플레이어 착석 배치) |
| `reference/sc2-arcade/images/screenshot_7af50de407ca.jpg` | 게임 초기 설정 화면 |
| `reference/sc2-arcade/images/screenshot_68a565910e9c.jpg` | 월드 랭킹 |
| `reference/sc2-arcade/images/screenshot_40d485af6739.jpg` | 상점 |

### 2.2 패치노트 918줄 — **엣지케이스의 금광**

| 경로 | 내용 |
|---|---|
| `reference/sc2-arcade/analysis/new_strings_by_version.json` | 버전별로 **새로 등장한 텍스트**. 144개 버전, 누적 918줄. 대부분이 패치노트다 |
| `reference/sc2-arcade/analysis/strings_current_v0.572.txt` | 최신 버전 문자열 99개 (룰 요약·승리조건 포함) |

제작자가 11년간 밟은 지뢰가 그대로 적혀 있다. **이걸 테스트 명세로 옮겨라.** (§7)

### 2.3 구조/메타데이터

| 경로 | 내용 |
|---|---|
| `reference/sc2-arcade/analysis/lobby_config_v0.572.md` | 로비 옵션 구조 (확장판 선택, 호스트/게스트/관전, 7인/8인) |
| `reference/sc2-arcade/analysis/version_timeline.csv` | 572개 버전 전체 (날짜·용량·의존성 변화) |
| `reference/sc2-arcade/analysis/milestones.json` | 파일명 53회·의존성 12회·변형 17회 변경 시점 |
| `reference/sc2-arcade/analysis/reviews_summary.md` | 리뷰 382건 (유저가 뭘 불평했는지 = UX 요구사항) |
| `reference/sc2-arcade/versions/v0.*.json` | 572개 버전의 맵 헤더 전문 |
| `reference/sc2-arcade/depot/s2ml/*.s2ml` | Blizzard depot에서 받은 원본 문자열 테이블 150개 (XML) |
| `reference/sc2-arcade/README.md` | 수집 경위와 한계 |

### 2.4 자료에 **없는** 것 — 원작 룰북으로 채워야 함

- **확장판 5종의 카드 목록**: 닷지 시티, 한줌의 카드, 와일드 웨스트 쇼, 골드러시, 그림자의 계곡
  (도감 이미지가 올라와 있지 않다. 패치노트에 이름만 산발적으로 등장)
- **덱 구성 매수**: 도감은 카드 *종류*만 보여준다. 각 카드가 덱에 몇 장인지, 무늬/숫자(♥♦♣♠ + A~K)는 원작 룰북 값을 써야 한다
- 이 맵 고유 창작 기능: **상점 / 월드랭킹 / 미니게임 / 이야기 모드** — 복원 불가

---

## 3. 도메인 모델

### 3.1 역할 (Role)

`reference/sc2-arcade/images/howtoplay_671dc0586240.jpg` 확인 결과:

| 역할 | 승리 조건 |
|---|---|
| 보안관 (Sheriff) | 모든 무법자와 배신자 제거 |
| 부관 (Vice/Deputy) | 보안관과 동일. 보안관을 지킨다 |
| 무법자 (Outlaw) | 보안관 제거 |
| 배신자 (Renegade) | 마지막까지 혼자 살아남기 |

추가 규칙 (`strings_current_v0.572.txt` 60~64행):
- 보안관이 제외되면 게임 즉시 종료
- 보안관 제외 시 배신자 혼자 남아 있으면 배신자 승리
- 무법자를 처치하면 현상금(카드 3장)
- 보안관이 부관을 죽이면 패널티(손패 전부 버림)

역할 카드 구성 — 이미지에서 7인 기준 확인(보안관1·부관2·무법자3·배신자1).
4~8인 표는 원작 룰북 값으로 채우고 **테이블로 상수화**하라:

```ts
// src/game/data/roles.ts
export const ROLE_DISTRIBUTION: Record<number, Role[]> = {
  4: ['sheriff', 'outlaw', 'outlaw', 'renegade'],
  // 5~8인은 룰북 대조 후 채울 것
}
```

이 맵은 **7인/8인 모드만** 제공한다(v0.539 패치노트: "게임 모드 선택이 7인과 8인으로 변경").
우리는 4~8인 전부 지원하되 기본값을 7인으로 둔다.

### 3.2 캐릭터 16종

`howtoplay_5a3151765feb.jpg`에서 이름·능력·최대체력(총알 개수)을 읽어 데이터화한다:

Bart Cassidy / Black Jack / Calamity Janet / El Gringo / Jesse Jones / Jourdonnais /
Kit Carlson / Lucky Duke / Paul Regret / Pedro Ramirez / Rose Doolan / Sid Ketchum /
Slab the Killer / Suzy Lafayette / Vulture Sam / Willy the Kid

한글명은 패치노트에 나오는 표기를 따른다(베라 커스터, 벌쳐 샘, 수지 라파예트, 독 홀리데이,
율 그리너, 테킬라 죠, 도로시 레이지, 주르도네, 리반클리프, 몰리 스타크 등 — 확장 캐릭터 포함).

### 3.3 카드

**기본 22종** (`howtoplay_058e97e1463e.jpg`):

- 갈색(즉시): BANG! / MANCATO!(빗나감) / BIRRA(맥주) / SALOON(주점) / GATLING(기관총) /
  INDIANI!(인디언) / EMPORIO(잡화점) / DILIGENZA(역마차) / WELLS FARGO(웰스 파고) /
  DUELLO(결투) / PANICO!(강탈) / CAT BALOU(캣 발루)
- 파랑(장착-무기): VOLCANIC① / SCHOFIELD② / REMINGTON③ / REV. CARABINE④ / WINCHESTER⑤
- 파랑(장착-기타): MIRINO(조준경) / MUSTANG(야생마) / BARILE(술통) / PRIGIONE(감옥) /
  DINAMITE(다이너마이트)

**하이 눈 15종** (`howtoplay_f5c505960482.jpg`): Blessing / Curse / Ghost Town / Gold Rush /
Hangover / Shootout / The Daltons / The Doctor / The Reverend / The Sermon / Train Arrival /
Thirst / New Identity / Handcuffs / High Noon

### 3.4 심벌 = 효과 원자

`howtoplay_8d3e2f235798.jpg`의 범례가 **효과 DSL의 스펙 그 자체**다. 그대로 타입으로 옮겨라:

| 심벌 | 의미 |
|---|---|
| 총알+X | 유효 거리 내 상대에게 뱅! |
| 모자+X | 뱅!에 당할 때 빗나감 효과 |
| 총알+초록십자 | 목숨 1점 획득 (최대치 초과 회복 불가) |
| 카드+화살표 | 카드 가져오기 |
| 카드+X | 카드 버리기 |
| 카드 2장 = | 효과 발동 위해 희생할 추가 카드 버리기 |
| 모자 1개 | 거리 무관하게 플레이어 1명 지정 |
| 모자 여러개 | 자기 자신 제외 전원 지정 |
| 모자(원) | 도달 가능한 거리 내 1명 지정 |
| ① | 거리 1 이내 지정 (장착 무기 미고려) |
| ②③④⑤ | 무기 장착 시 사정거리 |

---

## 4. 룰 엔진 설계 — 여기가 프로젝트의 전부다

렌더링은 쉽다. **어려운 건 반응 체인이다.** 패치노트 11년치가 그 증거다.

### 4.1 원칙

1. **순수 함수 reducer.** `(state, action) => state`. React/zustand와 완전히 분리한다.
   `src/game/engine/`은 RN import이 하나도 없어야 한다.
2. **난수 주입.** 전역 `Math.random()` 금지. seeded RNG를 state에 넣어 리플레이/테스트 재현성을 확보한다.
3. **불변 상태 + 이벤트 로그.** 모든 상태 전이는 `GameEvent`로 남긴다. 리플레이·디버깅·관전 기능이 여기서 공짜로 나온다.
4. **효과는 스택이다.** 카드 한 장이 즉시 해결되지 않는다. 중간에 다른 플레이어의 반응이 끼어든다.

### 4.2 상태

```ts
type GameState = {
  rng: RngState
  players: Player[]          // 착석 순서 = 배열 순서 (거리 계산의 기준)
  activePlayer: PlayerId
  phase: 'draw' | 'play' | 'discard'
  deck: CardId[]
  discard: CardId[]
  stack: EffectFrame[]       // 해결 대기 스택 (LIFO)
  awaiting: PendingInput | null   // 특정 플레이어의 입력 대기
  log: GameEvent[]
}

type Player = {
  id: PlayerId
  role: Role
  character: CharacterId
  hp: number
  maxHp: number              // 캐릭터 총알 수. 보안관은 +1
  hand: CardId[]
  equipment: CardId[]        // 장착 파랑 카드
  alive: boolean
}
```

### 4.3 효과 스택 — 핵심 설계

`BANG!` 한 장이 만드는 실제 흐름:

```
BANG! 플레이
  → 대상의 술통(Barile) 판정(draw!)   ← Lucky Duke면 2장 뽑아 선택
    → 성공하면 빗나감 1회 상쇄
  → Jourdonnais 능력 (술통 효과 내장) 판정
  → 대상에게 "빗나감 N장 요구" (Slab the Killer면 N=2)
    → 대상이 MANCATO! 제출 / Calamity Janet은 BANG!을 MANCATO!로 사용 가능
  → 미제출 시 피해 1
    → Bart Cassidy: 피해당 카드 1장 드로우
    → El Gringo: 가해자 손패 1장 강탈
    → hp 0 → 탈락 처리
      → Vulture Sam: 탈락자 카드 전부 획득
      → 무법자였다면 가해자 현상금 3장
      → 보안관이 부관을 죽였다면 가해자 손패 전부 버림
```

이걸 if 문으로 짜면 반드시 무너진다. 다음 두 축으로 설계하라:

**(a) EffectFrame — 해결 대기 프레임**

```ts
type EffectFrame =
  | { kind: 'bang'; source: PlayerId; target: PlayerId; missesRequired: number }
  | { kind: 'draw!'; owner: PlayerId; reason: DrawReason; resolve: (card: Card) => ... }
  | { kind: 'damage'; target: PlayerId; amount: number; source: PlayerId | null }
  | { kind: 'eliminate'; target: PlayerId; killer: PlayerId | null }
  | { kind: 'chooseCard'; chooser: PlayerId; from: CardSource; count: number }
  | ...
```

**(b) 능력 훅 — 캐릭터/장비가 끼어드는 지점**

훅 포인트를 **먼저 확정하고** 캐릭터를 그 위에 얹어라. 캐릭터마다 특수분기를 두면 안 된다.

| 훅 | 해당 캐릭터/장비 |
|---|---|
| `onDrawPhase` | Black Jack, Jesse Jones, Kit Carlson, Pedro Ramirez |
| `onDraw!` (판정) | Lucky Duke (2장 뽑아 선택) |
| `onIncomingBang` | Jourdonnais, Barile |
| `onOutgoingBang` | Slab the Killer (빗나감 2장 요구) |
| `onDamage` | Bart Cassidy, El Gringo |
| `onHandEmpty` | Suzy Lafayette |
| `onEliminate` | Vulture Sam |
| `onCardSubstitute` | Calamity Janet (BANG! ↔ MANCATO!) |
| `bangLimitPerTurn` | Willy the Kid, VOLCANIC (무제한) |
| `distanceModifier` | Paul Regret(+1 피격거리), Rose Doolan(-1 사격거리), MUSTANG, MIRINO |
| `anytime` | Sid Ketchum (카드 2장 → 체력 1) |

`Lucky Duke`는 판정을 1급 개념으로 만들어야만 깔끔해진다. 판정이 함수 호출이 아니라
**프레임**이어야 하는 이유다.

### 4.4 거리 규칙

착석 순서 원형 배열에서 시계/반시계 중 **짧은 쪽**. 탈락자는 원에서 제거한다.
여기에 `distanceModifier` 훅(무기 사정거리, 야생마, 조준경, Paul Regret, Rose Doolan)을 합산.
거리 계산은 **순수 함수 하나**로 격리하고 단위 테스트를 두껍게 깐다.

---

## 5. 디렉터리 구조

```
src/
  app/                    expo-router 라우트
    _layout.tsx
    index.tsx             로비
    game.tsx              게임 화면
  game/
    engine/               ★ RN import 금지. 순수 TS
      state.ts            GameState 타입
      reducer.ts          (state, action) => state
      stack.ts            EffectFrame 해결기
      hooks.ts            능력 훅 디스패처
      distance.ts         거리 계산
      rng.ts              seeded RNG
    data/
      cards.base.ts       기본 22종
      cards.highnoon.ts   하이 눈 15종
      characters.ts       캐릭터 16종
      roles.ts            역할 분배표
    store/                zustand — engine을 감싸기만 한다
    ui/
      Table.tsx           원형 테이블 레이아웃
      CardView.tsx
      PlayerSeat.tsx
      ReactionPrompt.tsx  반응 요구 UI
  components/             테마/공통
```

**경계 규칙:** `src/game/engine/`은 `src/game/data/` 외에 아무것도 import하지 않는다.
UI가 엔진을 알고, 엔진은 UI를 모른다.

---

## 6. UI 방향

`reference/sc2-arcade/images/screenshot_25aad3a471f5.jpg` 참고.
원본 맵의 강점으로 캡션에 적혀 있다: *"실제 테이블에서 둘러앉아서 하는 느낌을 강하게 받을 수 있는 레이아웃"*.

- 원형 배치. 본인은 항상 화면 하단
- 카드는 CSS/reanimated 기반 2D. 이미지 에셋 최소
- 반응 요구(빗나감 내라, 판정 결과 선택하라)는 **모달이 아니라 인라인 프롬프트**로.
  뱅!은 반응이 매우 잦아서 모달을 띄우면 게임이 끊긴다
- 원본 단축키 계승(패치노트 v0.24): `Q` 턴 끝내기, `W` 반응하지 않음

---

## 7. 테스트 전략 — 패치노트를 명세로 옮긴다

이게 이 프로젝트의 최대 이점이다. 남의 QA 로그 11년치가 있다.

`reference/sc2-arcade/analysis/new_strings_by_version.json`을 읽고,
버그 수정 항목을 **하나씩 vitest 케이스로** 옮겨라. 실제 원문 예시:

- `"베라 커스터가 벌쳐 샘을 복제한 경우, 벌쳐 샘과 카드를 나누어야 할 상황에서 문제를 수정"`
- `"베라 커스터로 변장한 직후, 능력사용이 안되는 문제"` / `"변장 후에도 여전히 능력을 사용할 수 있는 문제"`
- `"결전에서 리반클리프가 손에 뱅!이 없으면 능력사용이 불가능한 문제"`
- `"생존맥주를 사용할때 남은 플레이어의 수가 잘못 계산되는 문제"`
- `"독 홀리데이의 능력이 최대 한번만 발동할 수 있도록 변경"`
- `"빅스펜서가 Missed!카드를 버릴 수 없는 현상"`
- `"수지 라파예트가 일부 상황에서 능력이 발동되지 않는 문제"`
- `"묘지상황에서 보안관이 제거된 경우, 보안관의 역할카드가 섞이는 문제"`
- `"결전의 상황에서 일부카드를 뱅!으로 사용할때 거리에 문제가 발생"`

캐릭터 11명 / 카드 16종이 버그 리포트를 통해 언급된다.
**이 목록을 `docs/edge-cases.md`로 먼저 정리한 뒤 구현에 들어가라.**
구현 후에 읽으면 이미 늦는다.

기본 테스트 축:
- 거리 계산 (탈락자 제거 후 재계산 포함)
- 능력 훅 발동 순서와 중복 발동 방지
- 판정(draw!) + Lucky Duke 상호작용
- 탈락 연쇄 (다이너마이트로 여러 명이 동시에 죽는 경우)
- 역할 승리 판정 (보안관 제외 시점의 배신자 단독 생존)

---

## 8. 마일스톤

| 단계 | 범위 | 완료 기준 |
|---|---|---|
| M0 | 프로젝트 셋업, AGENTS.md, 참고자료 배치 | `npm run web` 뜬다 |
| M1 | 도감 이미지 → `cards.base.ts` / `characters.ts` 데이터화 | 22종 + 16종 타입 통과 |
| M2 | `docs/edge-cases.md` 작성 (패치노트 정리) | 케이스 40개 이상 목록화 |
| M3 | 엔진 코어: 상태·턴·드로우·거리, UI 없음 | vitest로 1턴 진행 |
| M4 | 효과 스택 + 훅. BANG!/빗나감/맥주/판정 | 반응 체인 테스트 통과 |
| M5 | 캐릭터 16종 전부 | M2 케이스 전부 통과 |
| M6 | 2D 테이블 UI + 로컬 핫시트 플레이 | 사람끼리 한 판 완주 |
| M7 | AI 상대 | 4인 AI 대전 완주 |
| M8 | 하이 눈 확장 | 15종 동작 |

**M3~M5를 UI 없이 끝내라.** 뱅!은 UI를 먼저 만들면 룰 버그를 UI 버그로 오인하게 된다.

---

## 9. 함정 (미리 알고 시작할 것)

1. **맥주는 2인만 남으면 효과가 없다.** 패치노트에 "남은 플레이어 수 계산" 버그가 있다.
2. **다이너마이트는 연쇄 탈락을 만든다.** 탈락 처리 중에 또 탈락이 발생하는 재진입을 견뎌야 한다.
3. **판정(draw!)은 함수가 아니라 프레임이다.** Lucky Duke 때문. 처음부터 그렇게 짜라.
4. **캐릭터 복제(베라 커스터, 닷지 시티)** 는 능력 훅을 런타임에 바꾼다. 훅 시스템이 정적 등록이면 못 버틴다. 확장 구현 예정이 없어도 훅 조회를 동적으로 설계해 두라.
5. **Calamity Janet의 카드 치환**은 "어떤 카드로 취급하는가"를 카드 사용 경로 전부에서 물어봐야 한다. 사용 시점 한 곳에서만 처리하면 결투/인디언에서 샌다.
6. **덱 소진 시 버린 더미를 섞어 재사용**한다. seeded RNG로 처리하고 테스트하라.
7. **감옥(PRIGIONE)은 보안관에게 사용 불가.**

---

## 10. 하지 말 것

- `src/game/engine/`에서 React/RN/Expo import 하지 말 것
- 전역 `Math.random()` 쓰지 말 것
- UI를 M5보다 먼저 만들지 말 것
- 캐릭터마다 `if (character === 'lucky-duke')` 식 분기를 엔진 코어에 넣지 말 것
- **참고 이미지의 카드 일러스트를 앱 에셋으로 복사하지 말 것.** dV Giochi 저작물이다.
  아트는 직접 제작하거나 도형/타이포로 대체한다
- 상점/랭킹/미니게임은 원본 맵 고유 기능이고 자료가 없다. 범위에 넣지 말 것

---

## 11. 첫 작업 지시

1. `reference/sc2-arcade/README.md`를 읽어 자료의 성격과 한계를 파악한다
2. `reference/sc2-arcade/images/howtoplay_058e97e1463e.jpg`,
   `howtoplay_5a3151765feb.jpg`, `howtoplay_8d3e2f235798.jpg`를 **Read 툴로 직접 열어**
   카드 22종·캐릭터 16종·심벌 범례를 읽는다
3. 읽은 내용을 `src/game/data/cards.base.ts`, `src/game/data/characters.ts`로 옮긴다.
   원작 룰북과 대조해 덱 매수·무늬·숫자를 채운다
4. `reference/sc2-arcade/analysis/new_strings_by_version.json`에서 버그 수정 항목을 추려
   `docs/edge-cases.md`를 만든다
5. 그 다음에 M3 엔진 코어에 착수한다

시작 전에 §1의 Expo 57 문서 규칙을 확인하라.
