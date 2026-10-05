# 보상($)·경험치 — 서버가 다시 접어 준다

## 왜 이 구조인가

판을 마치면 $10, 이기면 $10 더, 경험치도 쌓인다. 그런데 서버에는 게임 상태가 없고
액션 로그만 있다 (`docs/multiplayer.md`). 클라이언트가 "내가 이겼다" 고 쓰게 두면 개발자 도구로
얼마든지 고친다.

그래서 **지갑은 Cloud Functions 만 쓴다.** Functions 가 액션 로그를 클라이언트와 같은 순수 리듀서로
다시 접어 결과를 확인한 뒤에만 적는다. 클라이언트는 자기 지갑을 읽기만 한다 (`firestore.rules`).
엔진·AI·경제 모듈이 React 도 Firebase 도 모르는 순수 TypeScript 라서 가능하다
(`functions/build.mjs` 가 `src/game/{engine,data,modifiers,ai,economy}` 를 그대로 번들한다).

## 숫자 (`src/game/economy/constants.ts`)

| 항목 | 값 |
|---|---|
| 한 판 | `$10` · `20 XP` |
| 이기면 더 | `$10` · `30 XP` |
| 하루 $ 한도 | `$200` (한국 시간 날짜. 넘으면 $0, 경험치는 그대로. 원장에 `capped`) |
| 너무 짧은 판 | 2라운드 미만 또는 30수 미만이면 보상 없음 (`tooShort`) |
| 로그 크기 | 900 KB (Firestore 문서 1 MiB 안) |

레벨: 레벨 L 에 닿는 누적 경험치 = `100·L·(L−1)/2`. Lv2 100, Lv3 300, Lv4 600, Lv5 1000 …
(`level.ts` 의 `levelFromXp`).

보상이 없는 판: 관전(`controlled` 비어 있음), 저장본에서 이어 본 판(기록 앞부분이 없다),
`devEvent` 판, Firebase 구성이 비어 있는 상태.

## Firestore

```
users/{uid}                  { nick, createdAt, updatedAt }       본인 읽기 · nick 만 쓰기 (1~12자)
users/{uid}/wallet/main      { cash, xp, games, wins, day, dayCash, updatedAt }   본인 읽기 · 쓰기 금지
users/{uid}/ledger/{id}      { kind:'room'|'local', ref, cash, xp, won, capped, at }   본인 읽기 · 쓰기 금지
matches/{uid}_{seed}         로컬 판 기록. 본인이 한 번 만들고 서버가 status 를 바꾼다
  uid, seed, seats, controlled, log(JSON 문자열 Action[]), actions
  status: 'pending' | 'settled' | 'rejected', reason?, credit?, createdAt, settledAt?
rooms/{code}.settlement      { at, seq, credits: { uid: {cash, xp, won, capped} }, rejected? }  서버만 쓴다
```

문서 id 가 `uid_seed` 라 같은 시드로 두 번 받을 수 없다 (두 번째 create 는 규칙이 막는다).
로컬 판의 시드는 판 설정 화면에서 보이는 그 숫자다.

## 두 정산 경로

### 온라인 방 — `settleRoom` (callable)

판이 끝나면 자리에 앉은 **모두가** 부른다 (`store/use-settlement.ts`). 서버는

1. `rooms/{code}.settlement` 가 있으면 그대로 돌려준다 (멱등)
2. 호출자가 좌석에 있는지, 방이 로비가 아닌지 본다
3. `actions` 를 `seq` 순으로 읽어 1..actionCount 가 빈틈없는지 보고 다시 접는다 (`verifyRoomLog`)
4. 트랜잭션 하나로 사람 자리마다 지갑·원장(`room_{code}`)·`settlement`·`status: 'ended'` 를 쓴다

AI 자리의 수는 여기서 검증하지 않는다. 같은 로그를 여러 사람이 보고 있고, 친구끼리 하는 전제다.
결과는 방 문서의 `settlement` 로 돌아와 `watchRoom` 구독에 실려 온다.

### 로컬 AI 판 — `onMatchCreated` (Firestore 트리거)

판이 끝나면 클라이언트가 스토어의 `history`(startGame 부터 결과까지의 액션 전부) 를
`matches/{uid}_{seed}` 로 올린다. 서버는 `verifyLocalMatch` 로

- 첫 액션이 `startGame` 이고 시드·좌석·인원이 문서와 같은지
- 사람 자리가 **정확히 하나** 고 `controlled` 가 그 자리인지
- AI 자리의 수는 **같은 시드·같은 상태로 `decide()` 를 다시 돌려 똑같은지** (`actionKey` 비교)
- AI 자리의 `timeout` 은 거절 (가장 약한 수를 강제로 두게 하는 길이라서)
- 결과가 났고, 결과 뒤에 액션이 더 없고, 너무 짧지 않은지

를 보고 `settled` / `rejected`(+`reason`) 로 바꾼다. 사람 자리의 수는 리듀서가 합법성을 가린다
(불법이면 `rejected` 로그만 남고 상태가 안 바뀐다).

**시드 공식은 `src/game/ai/driver-policy.ts` 한 곳에 있다.** 클라이언트의 `ai-driver` 와
검증기가 같은 함수를 쓴다. 바꾸면 이미 올라간 기록은 검증을 못 넘는다.

하드 AI 는 수마다 14번 시뮬레이션하므로 7인 판 재생이 이 Mac 에서 약 13초, Functions 에서는
분 단위다 (`memory: 2GiB`, `timeoutSeconds: 540`). 결과 창은 그동안 "보상 확인 중…" 을 보인다.

### 드래프트 시드 주의

`ai-driver` 는 드래프트가 열린 상태 **하나로** 모든 AI 의 선택을 한꺼번에 계산한다. 그런데
`chooseAction` 이 `view.seq` 를 난수에 섞으므로, 앞사람의 선택이 접힌 뒤의 상태로 다시 계산하면
다른 캐릭터가 나온다. 검증기는 "드래프트가 열린 상태로 계산한 값" 과 "직전 상태로 계산한 값"
둘 중 하나와 같으면 받아들인다. `store.test.ts` 의 왕복 테스트가 이것을 지킨다.

## 화면

- 첫 화면 왼쪽 위 배지 `닉 · $12 · Lv 3` (`ui/menu/AccountBadge.tsx`). 누르면 설정창
- 설정창 "프로필" (닉네임 고치기 · 로그인 방식 · Google 연결) 과 "지갑" (돈 · 레벨과 경험치 바 · 전적)
- 결과 창의 보상 줄 (`ui/RewardLine.tsx`): 확인 중 / `+$10 · +20 XP` / 한도 / 거절 이유

닉네임은 `users/{uid}` 에 두고 기기에도 사본을 남긴다 (`firebase/profile.ts`). 로비의 좌석·채팅은
전과 같이 `getIdentity()` 로 읽는데, 이제 프로필 → 기기 → 기본값 순이다.

## 계정 연결

익명 uid 를 Google 에 묶으면 (`firebase/account.ts` 의 `linkGoogle`) uid 가 그대로라 지갑도 그대로다.
지금은 웹 팝업만 된다. 앱은 expo-auth-session 으로 자격 증명을 받아 `linkWithCredential` 하면 되지만
아직 붙이지 않았다. 이미 다른 uid 에 묶인 Google 계정이면 실패하고 지갑 병합은 하지 않는다.

## 돌려 보기

```bash
npm test                          # economy·driver-policy·store 왕복 테스트
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npm run test:rules
npm --prefix functions install && npm --prefix functions run typecheck && npm --prefix functions run build
npx firebase emulators:start --only auth,firestore,functions
```

`.env` (또는 `.env.local`) 에 `EXPO_PUBLIC_FIREBASE_EMULATOR=1` 을 넣으면 앱이 에뮬레이터에 붙는다.
Functions 에뮬레이터는 `functions/lib/index.js` 를 읽으므로 코드를 고치면 다시 `build` 한다.

배포 (Blaze 요금제 필요):

```bash
npx firebase deploy --only functions,firestore:rules
```

## 알려진 한계

- 로컬 판의 시드는 클라이언트가 고른다. 시드를 골라 가며 유리한 판을 찾는 것은 막지 않는다
  (하루 한도가 상한이다)
- 온라인 판의 AI 수는 검증하지 않는다
- 익명 계정은 기기마다 다르다. 기기를 바꾸면 Google 연결 전에는 지갑이 따라오지 않는다
- 로컬 판에서 AI 자리의 시간 만료는 정상 판에서도 아주 드물게 생길 수 있고, 그 판은 거절된다
