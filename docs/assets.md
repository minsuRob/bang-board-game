# 카드 그림

앱은 카드를 두 가지 방식으로 그린다.

1. **그림 없이** — 테두리 색(갈색=즉시 사용, 파랑=장착), 무늬와 숫자, 심벌 줄만으로 그린다.
   저장소를 그대로 받아 실행하면 이 모습이다.
2. **원본 그림으로** — `assets/cards/` 에 이미지가 설치돼 있으면 그쪽을 쓴다.

**어느 쪽이든 게임 동작은 완전히 같다.** 그림은 보기에만 관여한다.

## 왜 저장소에 없나

카드 일러스트는 dV Giochi 의 저작물이다. 저장소에 넣으면 그대로 재배포가 되므로
`assets/cards/`, `assets/board/`, `assets-source/` 를 전부 `.gitignore` 로 막아 두었다.

## 설치하기

`assets-source/` 에 원본을 모아 둔 뒤:

```bash
node scripts/install-art.mjs
npm run web   # Metro 를 다시 시작해야 반영된다
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
```

이름은 `src/game/data/` 의 id 와 정확히 같아야 한다.

## 어떻게 붙어 있나

`src/game/ui/card-art.ts` 가 `require.context` 로 폴더를 통째로 읽는다.
파일을 하나하나 `require` 하면 이미지가 없을 때 번들이 깨지므로 그렇게 하지 않았다.

```ts
const art = playingCardArt(kind);   // 없으면 null
```

`CardView` 는 `art` 가 있으면 그림을, 없으면 타이포를 그린다.

## 무늬와 숫자는 왜 덮어 그리나

제작사가 올려 둔 카드 그림은 종류마다 한 장뿐이라, 거기 인쇄된 무늬·숫자는 대표값이다.
그런데 이 게임의 뱅!은 25장이고 저마다 무늬가 다르다. 판정(술통·감옥·다이너마이트)과
블랙 잭·수갑이 그 값을 보므로, 실제 카드의 무늬·숫자를 왼쪽 아래에 덮어 그린다.

## 배포 전에

그림을 넣은 채로 배포하면 저작권 문제가 된다. 배포는 그림 없이 하거나,
직접 그린 아트로 교체해야 한다.
