# 한국어 · English · Italiano 번역 체계

## 배경

지금은 화면 문구가 전부 한국어로 소스에 박혀 있다. 번역 코드는 하나도 없다.

| 영역 | 규모 |
|---|---|
| 라우트·UI·3D 테이블·firebase·저장 | 약 850개 |
| 게임 내용: 카드 37 · 캐릭터 42 · 이벤트 40 · 골드 15 · 직업·확장판 이름 (설명 포함) | 약 270개 |
| 게임 로그: 엔진의 `log()` 호출 지점 | 113곳 |

게임 로그가 가장 까다롭다. 엔진이 로그를 남길 때 한국어 문장을 다 만들어서 `GameEvent.text` 에 넣는다 (`engine/cards.ts:90`, 이름은 `nameOf()`→`nameKo`).
다행히 멀티플레이는 액션만 주고받고, 각 기기가 그 액션을 다시 돌려 판을 만든다 (`firebase-transport.ts`).
그래서 문장을 언제 만드느냐를 엔진 쪽에서 화면 쪽으로 옮겨도 네트워크 형식은 그대로다.

**목표**
- 화면에 보이는 문구를 모두 ko/en/it 로 낸다. 로그와 카드 설명도 포함한다.
- 언어는 기본으로 기기 설정을 따른다. 첫 번째 선호 언어가 ko 나 it 이면 그 언어로, 아니면 en 으로 보인다.
- 설정창에서 언어를 직접 고를 수도 있다: 시스템 / 한국어 / English / Italiano. 기본값은 "시스템"이다.

## 설계 원칙

- **i18n 라이브러리를 쓰지 않는다. 직접 만든 타입 있는 사전을 쓴다.**
  - `ko` 사전이 원본이고, 사전 타입은 `Messages = typeof ko` 다.
  - `en`·`it` 는 `const en: Messages = {...}` 로 선언한다. 키가 하나라도 빠지면 `npm run typecheck` 가 실패한다.
  - 문자열 키 대신 객체 접근으로 쓴다: `const t = useT(); t.settings.theme.title`. 자동완성이 되고 오타는 컴파일 오류가 된다.
- **문구에 변수가 들어가면 함수로 쓴다.**
  - 복수형: `(n) => n === 1 ? '1 carta' : \`${n} carte\``
  - 한국어 조사: ko 함수 안에서 `engine/josa.ts` 의 `ga/eul/neun/wa/ro` 를 그대로 쓴다.
  - 이렇게 하면 ICU 문법이나 별도 라이브러리가 필요 없다.
- **엔진은 문장을 만들지 않는다.** 엔진은 "무슨 일이 있었나"를 id 로만 남긴다. 문장은 화면 쪽 렌더러가 현재 언어로 만든다.
  - 그래서 순수 폴더(engine/data/modifiers/ai/economy)에는 번역 사전이 들어가지 않는다.
  - Cloud Functions 번들도 커지지 않는다.
- **런타임 대체 언어는 en 하나뿐이다.** 타입 덕분에 en 사전은 항상 빠짐이 없으므로, 대체가 필요한 경우는 언어를 고르는 단계 하나뿐이다.

## 구조

```
src/i18n/
  lang-store.ts        # 'system'|'ko'|'en'|'it', 키 bang.ui.lang. theme-store.ts 와 같은 방식
                       #   (웹은 localStorage 동기 읽기, 앱은 AsyncStorage)
  resolve.ts           # 순수 함수 resolveLang(pref, locales) → 'ko'|'en'|'it'
                       #   locales[0].languageCode 가 ko·it 면 그대로, 그 밖은 en
  use-t.ts             # useLang(): lang-store + expo-localization 의 useLocales() 를 합친다
                       # useT(): 현재 언어 사전 / getT(): React 밖(스토어·에러 처리)에서 쓰는 판
  format.ts            # 날짜·초·숫자 포맷 (save-model 의 "N월 N일" 을 대신한다)
  messages/{ko,en,it}/ # 화면 문구. 이름공간마다 파일 하나
    common.ts menu.ts room.ts local.ts table.ts actions.ts codex.ts
    settings.ts result.ts save.ts errors.ts chat.ts fx.ts ...
    index.ts           # 이름공간들을 모은다. ko/index.ts 가 Messages 타입을 내보낸다
  content/{ko,en,it}.ts  # 게임 내용
                       #   cards: Record<CardKind,{name,text}>, characters, events, gold,
                       #   roles{name,goal}, expansions, abilities(능력 id→라벨),
                       #   judgement(판정 목적), resultReason, rewardReject
  log/{ko,en,it}.ts    # LogMsg 렌더러: { [K in LogMsg['k']]: (m, ctx) => string }
  names.ts             # useNames(): cardName(kind), charName(id), roleName(role)…
  glossary.md          # 용어집 (아래 "번역 작업" 참고)
```

### 언어 고르기·설정

- 패키지를 더한다: `npx expo install expo-localization`.
- `app.json` plugins 에 `["expo-localization", { "supportedLocales": { "ios": ["en","ko","it"], "android": ["en","ko","it"] } }]` 를 넣는다.
  - 이러면 iOS 설정 앱과 Android 13 이상에서 앱별로 언어를 고를 수 있다.
  - `getLocales()[0]` 도 그 선택을 따라간다. 네이티브 빌드에서만 적용된다.
- `useLocales()` 는 OS 언어가 바뀌면 다시 렌더된다. 그래서 따로 처리하지 않아도 앱으로 돌아왔을 때 새 언어가 반영된다.
- `SettingsSheet.tsx` 의 "화면 테마" 섹션 아래에 "언어" 섹션을 둔다.
  - 기존 `InkSegmented` 를 다시 쓴다.
  - 각 언어 이름은 그 언어로 쓴다: 한국어 / English / Italiano.
  - `useSettingsSummary()` 에도 언어를 넣는다.
- `+html.tsx`
  - `<html lang="ko">` 고정값을 없앤다.
  - `THEME_BOOT` 처럼 `LANG_BOOT` 를 둔다. `bang.ui.lang` 이 있으면 그것을, 없으면 `navigator.language` 를 써서 `document.documentElement.lang` 을 정한다.
  - 언어가 바뀔 때마다 `lang` 속성도 바꾼다.

### 화면 문구 바꾸는 방식 (약 850개)

- **컴포넌트**: 컴포넌트 안에서 `const t = useT()` 를 부르고, 리터럴을 `t.ns.key` 로 바꾼다.
- **모듈 최상단 상수에 든 문구** (예: `THEME_OPTIONS`, `THEME_HINT`, `ROLE_GOAL` 류)
  - `(t) => [...]` 함수로 바꾸거나, `{ value, labelKey }` 형태로 바꾼다.
  - 상수는 언어가 바뀌어도 다시 계산되지 않기 때문이다.
- **테스트로 도는 순수 텍스트 헬퍼** (`chat-text.ts`, `table-text.ts`, `use-table.ts` 의 계산부)
  - 사전 `t` 와 이름 조회 함수를 인자로 받게 바꾼다.
  - 기존 테스트에는 `ko` 사전을 넘긴다. 그러면 한국어 기대값을 그대로 둘 수 있다.
- **사용자가 직접 쓴 글은 번역하지 않는다**: 닉네임, 채팅 본문.
- **번역하지 않는 개발용 문구**: `table3d/demo/FxDemo.tsx`, `PlayedCardSpotlight` 의 "연출 시험" 데모, `fx/card-fx.ts` 의 `doc:` 메타데이터, `console.warn`, 엔진의 `throw new Error` 불변식 메시지. 아래 검사 테스트의 허용 목록에 올린다.

### 게임 내용 (`src/i18n/content`)

**공식 이름을 쓴다**
- `data/*.ts` 의 `name`(인쇄된 원어)을 기준으로 삼는다.
  - 기본·계곡 카드는 이탈리아어다 (`MANCATO!`, `BIRRA`).
  - 캐릭터·이벤트는 영어 고유명이다.
  - 골드 카드는 이탈리아어와 `nameEn` 이 함께 있다.
- **en**: 공식 영문판 이름을 쓴다 (Missed!, Beer, Stagecoach, General Store…).
- **it**: dV Giochi 원판 이름을 쓴다. 이벤트는 공식 이탈리아어판 이름을 쓴다.

**data 에서 한국어를 걷어낸다**
- `nameKo`·`text`·`ability` 를 `content/ko.ts` 로 옮긴다. 옮긴 뒤 data 에는 규칙과 숫자만 남는다.
- `nameKo` 를 쓰는 곳이 52개 파일이다. `names.ts` 헬퍼로 바꾼다.

**한국어 라벨만 있는 표를 키로 바꾼다**
- 대상: `ROLE_LABEL`·`ROLE_GOAL`(`data/roles.ts`), `EXPANSION_LABEL`(`data/types.ts:179`), `PURPOSE_LABEL`(`frames/judgement.ts:32`), `REJECT_LABEL`(`economy/model.ts:71`), AI 등급·속도 라벨(`ai/types.ts`).
- 순수 폴더에는 키만 남긴다. 화면에 보일 이름은 `content` 에서 찾는다.

**Modifier 능력 라벨**
- 대상: modifiers 의 11곳.
- `label` 문자열을 없애고 능력 id 를 키로 쓴다.

**`GameResult.reason`**
- 지금은 한국어 문장이다 (`frames/win.ts`). 이것을 `ResultReason` 키로 바꾼다.

**카드 그림 위 이름 띠** (`CardView.tsx:9`)
- 지금은 한국어 이름 띠를 덧씌운다.
- 바꾼 뒤에는 현재 언어 이름을 띄운다.
- 단, 그 이름이 카드에 인쇄된 원어와 같으면 띠를 생략한다. 이탈리아어에서는 대부분 생략된다.

### 게임 로그 구조화 (엔진 113곳)

`GameEvent` 를 이렇게 바꾼다 (`engine/types.ts:444`).
- `text: string` → `msg: LogMsg`
- `secret.text` → `secret.msg: LogMsg`

`LogMsg` 는 `k` 로 갈라지는 타입이다. 매개변수는 id 만 쓴다.

```ts
// engine/log-msg.ts (순수)
export type LogMsg =
  | { k: 'missed'; who: PlayerId }
  | { k: 'played'; who: PlayerId; card: CardKind; as?: CardKind; to?: PlayerId; ricochet?: boolean; again?: boolean }
  | { k: 'gameEnd'; reason: ResultReason; roles: Role[] }
  | ...
```

- **id 만 쓰는 이유**: 이름을 문장에 미리 넣지 않아야 캐릭터명과 카드명이 각 언어로 렌더된다.
- **문장 갈래도 매개변수로 넘긴다.** 같은 `t` 안에서 조건에 따라 문장이 갈리는 곳이 있다 (`reducer.ts:147`, `frames/cards.ts:69`, `combat.ts:157`). 이런 곳은 갈래를 `LogMsg` 매개변수(불리언·열거)로 넘긴다.
- **엔진에서 더 쓰지 않는 것**: `nameOf()` 와 josa 를 엔진의 로그용으로는 쓰지 않는다. josa 는 이제 `log/ko.ts` 가 쓴다.
- **`view.ts:78` 의 비밀 로그 교체**: `text` 대신 `msg` 를 바꿔 끼운다.
- **화면 쪽**
  - `log-text.ts` 의 `splitLogText` 는 지금 `nameKo` 를 문장에서 찾는다.
  - 이것을 현재 언어의 카드 이름으로 찾게 바꾼다. 찾을 대상은 그 항목의 `card`/`cards` 에서 나온다.
  - `LogPanel` 은 `renderLog(e, lang, ctx)` 를 부른다.
- **이전 저장 파일**: 예전 저장 파일에는 `text` 만 있다. `legacyText?: string` 으로 읽어 한국어 그대로 보여 준다.
  - `save-model` 이 불러올 때 `text` → `legacyText` 로 옮긴다.
- **이 작업이 엔진 판정을 바꾸지 않는다는 근거**: AI(`belief.ts:207`)와 테스트(`logged(state, t)`)는 `t` 만 읽는다. `text` 를 읽는 쪽은 화면뿐이다.

### Cloud Functions 오류

- **서버**: `functions/src/settle-room.ts:21-46` 의 `HttpsError` 가 셋째 인자로 `{ reason: 'no-room' | 'not-signed-in' | ... }` 를 함께 보내게 한다. 메시지 본문은 개발자용 영어로 바꾼다.
- **클라이언트**: `firebaseErrorText(err, t)` 가 `reason` 을 `t.errors.*` 로 바꾼다. 모르는 사유면 `t.errors.unknown` 을 보인다.
- **`src/firebase/*`**: 한국어 오류 문구도 같은 방식으로 바꾼다.
- **`verify.ts` 의 `detail`**: 기록 전용이라 그대로 둔다. 화면에는 `REJECT_LABEL` 키만 보인다.

### 웹 폰트

- **문제**: `western-fonts.ts` 의 `label` 폰트(Black Han Sans)에는 à·è·ì·ò·ù 가 없을 수 있다.
- **방안**: 언어에 따라 `label`·`body` 폰트를 고른다.
  - ko 는 그대로 둔다.
  - en/it 는 라틴 확장 글자를 가진 서부풍 굵은 서체를 쓴다. 후보는 Alfa Slab One 이고, 구현할 때 확인한다.
- **확인 방법**: "Perché più città" 를 화면에 띄워 스크린샷으로 본다.
- **네이티브**: 시스템 폰트라 문제없다.

## 번역 작업 (일괄)

1. **용어집을 먼저 만든다** (`src/i18n/glossary.md`).
   - 직업, 사거리, 장비, 손패, 판정, 탈락, 금덩이 등 핵심 용어를 3개 언어로 정한다.
   - 예: 뱅! = BANG!/BANG!, 빗나감! = Missed!/Mancato!, 보안관 = Sheriff/Sceriffo, 부관 = Deputy/Vice, 무법자 = Outlaw/Fuorilegge, 배신자 = Renegade/Rinnegato.
   - 모든 번역이 이 용어집을 따른다.
2. **ko 를 추출한다.** 리터럴을 `messages/ko/*` 로 옮기고 코드를 `t.*` 로 바꾼다.
   - 한국어 문구가 바뀌지 않아야 한다. 기존 테스트가 그대로 통과하는 것으로 확인한다.
3. **en/it 를 채운다.** 이름공간마다 ko 를 보고 en·it 를 쓴다.
   - en/it 사전에 키가 빠지면 타입 검사가 잡는다.
   - 카드·능력 설명은 공식 영문·이탈리아어 규칙서의 표현을 우선한다.
   - it 는 공개 배포 전에 원어민 검수를 한 번 받는다.
4. **작업 묶음**: 묶음끼리 겹치는 파일이 없다. 그래서 묶음 A 다음에 B1~B5·C 를 동시에 할 수 있다.
   - **A 기반**: lang-store, resolve, useT, 설정 섹션, html lang, 검사 테스트. 맨 먼저 단독으로 한다.
   - **B1** `src/app` 라우트 (약 109)
   - **B2** `ui/use-table.ts`·`table-text.ts`·`ActionBar`·스포트라이트·`EventAbilityPanel`·`GoldPanel` (약 280)
   - **B3** `ui` 나머지 + `settings/` + `menu/` + `chat-text` (약 150)
   - **B4** `ui/codex` (약 160)
   - **B5** `table3d` + `firebase` + `store` + `save` + functions 오류 (약 100)
   - **C** 게임 내용 사전 + data 에서 `nameKo` 등 걷어내기 + `names.ts` 로 바꾸기
   - **D** 로그 구조화. 엔진 파일을 나눠 차례대로 바꾼다. `LogMsg` 타입 하나를 함께 고치므로 동시에 하지 않는다.
     - D1: `cards`·`play`·`reducer`·`stack`·`turn`·`win`
     - D2: `frames/*`
     - D3: `fistful`·`valley`·`wildwest`·`gold*`·`draft`·`event-abilities`
   - **E** en/it 채우기. B~D 각 묶음이 끝나는 대로 그 이름공간을 바로 번역한다.
5. **커밋**: 묶음마다 커밋한다. 저장소 관례대로 한국어 "~한다" 문체로 쓴다.

## 빠진 번역을 막는 장치

- **`src/i18n/__tests__/no-hangul.test.ts`**
  - 방식: `typescript` 컴파일러 API 로 문자열 리터럴, 템플릿 리터럴, JSX 텍스트를 훑는다. 그 안에 한글이 있으면 실패한다.
  - 훑는 곳: `src/app`, `src/game/ui`, `src/game/table3d`, `src/firebase`, `src/game/store`, `src/game/save`, `src/game/data`, `src/game/modifiers`, `src/game/economy`, `src/game/ai`.
  - 예외: `src/i18n/` 와 주석, 위의 개발용 허용 목록.
  - 엔진은 로그에서 `text` 필드가 사라지므로 타입이 막는다. 엔진의 `throw` 메시지는 허용한다.
- **`npm run i18n:check`**: `art:check` 와 같은 식이다. en/it 사전에 한글이 남았거나 ko 와 똑같은 값이 있으면 목록으로 보인다.
- **로그 렌더 테스트**: 시뮬레이터 엔진으로 시드 판 여러 개를 돌린다. 모든 로그를 3개 언어로 렌더해서 다음을 확인한다.
  - 문장이 비지 않는다.
  - `undefined` 가 찍히지 않는다.
  - en/it 에 한글이 없다.
- **`resolveLang` 단위 테스트**: `ko-KR`→ko, `it-CH`→it, `en-GB`→en, `fr-FR`→en, `ja`→en, 빈 목록→en.
- **경계 테스트** (`boundary.test.ts`): 순수 폴더가 `src/i18n` 을 import 하지 않는지도 함께 막는다.

## 문서

- **`AGENTS.md`**: "## 한국어" 절을 "## 문구와 언어" 로 바꾼다. 담을 내용:
  - 문구는 `useT()` 로 넣는다.
  - ko 가 원본이고, en/it 를 같은 커밋에 넣는다.
  - 조사는 ko 렌더러에서 josa 로 붙인다.
  - 엔진 로그는 `LogMsg` 로 남긴다.
- **`docs/i18n.md`** 를 새로 쓴다. 구조, 언어 고르는 규칙, 새 문구 넣는 법, 용어집 위치를 적는다.
- **`docs/expansion-playbook.md`**
  - 46행·85행을 3개 언어 기준으로 고친다.
  - 데이터 단계에 `content/{ko,en,it}` 에 이름 넣기를 더한다.

## 확인

```bash
npm test && npm run typecheck
npm run simulate -- --games 100 --players 7   # 엔진 로그를 건드리므로 꼭 돌린다
npm run i18n:check
```

**화면 확인** (프리뷰. 먼저 `localStorage bang.sfx.muted=1`)
- 설정창에서 언어를 한국어 / English / Italiano 로 바꿔 가며 아래 화면을 본다.
  - 첫 화면 메뉴 부채
  - 로컬 판 시작
  - 판 화면: 행동 바, 로그, 카드 호버, 결과창
  - 도감
  - 설정창
- 모바일 폭(375)에서 it 로 넘침과 잘림을 확인한다. it 문구가 가장 길다.
- "시스템" 선택에서는 브라우저 언어를 바꿔 it·fr 로 확인한다. fr 이면 en 이 나와야 한다.
- 이전 버전 저장 파일을 불러와 로그가 깨지지 않는지 본다.
