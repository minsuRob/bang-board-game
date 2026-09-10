# 온라인 대전 — 클라이언트 락스텝

## 왜 이 구조인가

서버에는 **게임 상태를 두지 않는다.** 액션 로그만 순서대로 쌓고, 모든 클라이언트가
같은 순수 리듀서 `reduce(state, action)` 로 그 로그를 접어 같은 판을 만든다.

이게 가능한 이유는 엔진이 세 가지 성질을 지키기 때문이다.

1. **순수 함수.** `src/game/engine/` 은 React·RN·Firebase 를 import 하지 않는다
   (`boundary.test.ts` 가 강제한다).
2. **시드 난수.** 상태에 `{ seed, n }` 두 정수만 들고 있고 전역 `Math.random()` 을 쓰지 않는다.
3. **JSON 왕복 가능.** 상태에 함수·Map·Set 이 없다.

그래서 `startGame` 부터 마지막 액션까지 다시 접으면 언제나 같은 상태가 나온다.
새로고침·재접속·관전이 여기서 공짜로 나온다.

**대가는 분명하다.** 락스텝이라 손패와 덱 순서가 클라이언트 메모리에 존재한다.
개발자 도구를 여는 사람을 막지 못한다. **친구끼리 하는 전제**다.
서버 권위가 필요해지면 같은 리듀서를 Cloud Functions 에서 돌리고, 클라이언트에는
`viewFor()` 로 가린 상태만 내려보내면 된다 (엔진은 그대로 쓴다).

## Firestore 구조

```
rooms/{CODE}                      ← 방 코드가 곧 문서 id. 색인 없이 바로 찾는다
  code, hostUid, status            'lobby' | 'playing' | 'ended'
  playerCount, highnoon, tier
  seats: [{ uid, nick, ai }]       배열 인덱스 = 좌석 번호 = 엔진의 pN
  seed                             판의 시드
  actionCount                      지금까지 확정된 액션 수

rooms/{CODE}/actions/{seq}        ← 덧붙이기만 되는 로그. 문서 id 가 곧 순번
  seq, uid, action, ts

rooms/{CODE}/members/{uid}        ← 참가 표식 겸 생존 신호
  nick, lastSeen
```

## 순서 확정

액션 제출은 트랜잭션 하나다.

```
runTransaction:
  count = room.actionCount
  seq   = count + 1
  create actions/{seq}   { seq, uid, action }
  update room.actionCount = seq
```

두 사람이 동시에 내면 한쪽 트랜잭션이 재시도되어 `seq` 가 하나 밀린다.
그래서 **전역 순서가 하나로 정해진다.** 순서 경쟁에서 밀린 액션이 그 시점에
불법이 되면, 리듀서가 모든 클라이언트에서 **똑같이** 거부하고 로그에 `rejected` 만 남긴다.
상태가 갈라지지 않는다.

구독은 `orderBy('seq')` 로 하되, 앞 순번이 비어 있으면 **기다린다.**
Firestore 스냅숏은 중간이 비어서 올 수 있는데, 그대로 접으면 판이 어긋난다.

## 드라이버

AI 자리와 제한시간 만료는 **한 명만** 굴려야 한다. 여럿이 굴리면 같은 액션이 두 번 들어간다.

- 드라이버 = `members.lastSeen` 이 30초 안쪽인 참가자 중 **좌석 번호가 가장 작은 사람**
- 그 사람이 끊기면 다음 사람이 자동으로 이어받는다 (별도 합의 절차 없음)
- 생존 신호는 12초마다

## 제한시간

원본 SC2 아케이드 맵이 11년간 쓴 값을 그대로 가져왔다 (v0.128 '보통' 속도).

| 상황 | 제한 |
|---|---|
| 반응 (빗나감·결투 응수·잡화점 선택) | 12초 |
| 카드 사용 단계 | 60초 |
| 버리기 단계 | 30초 |

만료되면 드라이버가 `{ type: 'timeout', pid }` 를 넣고, 리듀서가 **결정적인 기본 행동**을
대신 수행한다 (`defaultAction()`). 기본 행동이 비결정적이면 리플레이가 깨진다.

- 반응 → 반응하지 않음. 단 러키 듀크의 판정 선택만은 유리한 쪽을 자동으로 고른다
- 카드 사용 단계 → 차례 마치기
- 버리기 단계 → 첫 카드 버리기

패치노트에서 가장 많은 비중을 차지한 문제가 "이탈 시 프레임이 멈춤"이었다.
온라인에서 이탈은 예외가 아니라 **응답의 한 종류**다.

## 보안 규칙 (`firestore.rules`)

- 로그인(익명 포함)한 사람만 읽고 쓴다
- `actions` 는 **create 만** 허용. update·delete 는 전부 막는다
- `actions` 문서의 `uid` 는 `request.auth.uid` 와 같아야 하고, `seq` 는 문서 id 와 같아야 한다
- 액션을 쓰려면 `members/{uid}` 문서가 있어야 한다 (= 그 방에 들어와 있어야 한다)
- 방 설정은 호스트만 바꾼다. 나머지는 `seats`·`actionCount` 만 건드릴 수 있다

## 설정하기

1. Firebase 콘솔에서 프로젝트를 만들고 **웹 앱**을 등록한다
2. Authentication 에서 **익명 로그인**을 켠다
3. Firestore 를 만든다 (프로덕션 모드)
4. `.env.example` 을 `.env` 로 복사해 `EXPO_PUBLIC_FIREBASE_*` 여섯 값을 채운다
5. 규칙을 올린다

```bash
npx firebase deploy --only firestore:rules
```

값이 비어 있으면 홈 화면의 온라인 메뉴가 잠기고 로컬 대전만 열린다.

## 로컬 에뮬레이터로 시험하기

```bash
npx firebase emulators:start
```

그리고 `.env` 에 `EXPO_PUBLIC_FIREBASE_EMULATOR=1` 을 넣는다.
`apiKey`·`projectId`·`appId` 는 아무 값이나 있으면 된다 (에뮬레이터는 검증하지 않는다).

브라우저 탭 두 개로 같은 방에 들어가면 한 대에서 대전을 확인할 수 있다.

## 알려진 한계

- 손패가 클라이언트에 있다 (위 "대가" 참고)
- 방을 정리하는 배치 작업이 없다. 끝난 방은 `status: 'ended'` 로 남는다
- 관전 전용 입장은 아직 없다. 자리에 앉아야 들어온다
