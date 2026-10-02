# 카드 그림

앱은 카드를 두 가지 방식으로 그린다.

1. **원본 그림으로** — `assets/cards/`, `assets/board/` 의 그림을 쓴다. 저장소에 커밋돼 있어
   받아서 실행하면 이 모습이다.
2. **그림 없이** — 테두리 색(갈색=즉시 사용, 파랑=장착), 무늬와 숫자, 심벌 줄만으로 그린다.
   그림 파일이 빠진 카드는 이쪽으로 되돌아간다.

**어느 쪽이든 게임 동작은 완전히 같다.** 그림은 보기에만 관여한다.

## 그림은 커밋한다

카드 일러스트는 dV Giochi 의 저작물이다. 예전에는 `.gitignore` 로 막아 두었는데,
그러자 작업 폴더마다 **그 폴더에 우연히 들어 있는 그림**으로 번들돼 화면이 서로 달랐다 (2026-10 조사).

| 위치 | 캐릭터 | 해상도 | 이벤트 | 역할 | 보드 |
|---|---|---|---|---|---|
| 메인 폴더 `assets/` | 16 | 162×180 | 15 | 4 | 3 |
| 다른 워크트리 | 16 | 96×140 | 15 | 0 | 0 |
| 배포본 bang-board.web.app | 49 | 250×389 | 30 | 4 | 4 |

코드 차이는 없었다. 덜 갖춘 폴더에서 `npm run deploy` 를 하면 사이트 화질도 조용히 떨어질 수 있었다.

그래서 앱이 쓰는 사본 `assets/cards/`, `assets/board/` 를 git 에 넣었다 (약 15MB, 110장).
처음 커밋한 세트는 배포본 번들에서 꺼낸 그림에 이 폴더의 더 선명한 보드 두 장을 합친 것이다
(`scripts/art/extract-deployed.mjs`). 이제 **git 에 있는 그림이 기준**이다.

- `assets-source/`(원본 모음)는 여전히 `.gitignore` 다. 앱에는 `assets/` 사본만 있으면 된다.
- 그림을 바꾸면 같은 커밋에 넣는다. git 이력에 예전 그림이 남으니, 같은 그림을 자주 갈아 끼우지 않는다.
- 공개 배포 전에는 저작권을 다시 검토한다.

## 빠진 그림 확인

```bash
npm run art:check
```

게임 데이터(`src/game/data/`)의 카드·캐릭터·역할·이벤트 id 와 `assets/` 를 대조해 빠진 그림과
저화질 캐릭터(세로 389 미만)를 보여 준다. 2026-10 기준 빠진 것: 그림자의 계곡 카드 15,
와일드 웨스트 쇼 캐릭터 8 · 이벤트 10. 배포본에도 없다.

## 새 그림 넣기

`assets-source/` 에 원본을 모은 뒤:

```bash
node scripts/install-art.mjs      # assets-source/ → assets/ 복사
npm run art:check                 # 빠짐이 줄었는지
git add assets/cards assets/board
npm run web                       # Metro 를 다시 시작해야 반영된다
```

폴더 구조는 이렇다.

```
assets-source/
  cards/base/{카드종류}.png        bang.png, missed.png, beer.png ...
  cards/characters/{캐릭터id}.png  bartCassidy.png, blackJack.png ...
  cards/roles/{역할}.png           sheriff.png, deputy.png, outlaw.png, renegade.png
  cards/highnoon/{이벤트id}.png    blessing.png, curse.png, ghostTown.png ...
  cards/back.png                   카드 뒷면
  board/wood-table.jpg             화면 바탕
  board/leather-1.jpg              테이블 표면
  board/player-board.webp          좌석마다 까는 플레이어 보드 (총알 5칸 · 직업/캐릭터/무기 슬롯)
```

이름은 `src/game/data/` 의 id 와 정확히 같아야 한다. 확장판 그림은 `docs/expansion-playbook.md` 2단계를 따른다.

## 어떻게 붙어 있나

`src/game/ui/card-art.ts` 가 `require.context` 로 폴더를 통째로 읽는다.
파일을 하나하나 `require` 하면 이미지가 없을 때 번들이 깨지므로 그렇게 하지 않았다.

```ts
const art = playingCardArt(kind);   // 없으면 null
```

`CardView` 는 `art` 가 있으면 그림을, 없으면 타이포를 그린다.

3D 테이블의 좌석 보드는 `playerBoardArt()` 를 쓴다. 없으면 `playerBoardTexture()` 가
총알 윤곽과 슬롯만 찍은 판으로 대신한다. 슬롯·총알 좌표는 `table3d/core/layout.ts` 의
`BOARD_SLOTS` 가 원본(747×531) 비율로 들고 있으니, 다른 판 그림을 쓰면 그 값도 맞춘다.

## 무늬와 숫자는 왜 덮어 그리나

제작사가 올려 둔 카드 그림은 종류마다 한 장뿐이라, 거기 인쇄된 무늬·숫자는 대표값이다.
그런데 이 게임의 뱅!은 25장이고 저마다 무늬가 다르다. 판정(술통·감옥·다이너마이트)과
블랙 잭·수갑이 그 값을 보므로, 실제 카드의 무늬·숫자를 왼쪽 아래에 덮어 그린다.
