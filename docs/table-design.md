# 탁자 디자인

3D 판의 탁자(펠트 원판)를 **올가미 밧줄을 두른 가죽 + 가운데 BANG! 각인**으로 바꾼 기록이다.
갈색 펠트 원판에 잡음만 곱하던 탁자를 고르기까지 무엇을 거쳤는지, 다시 손볼 때 어디를 고치는지 적는다.

## 지금 모양

- **바탕:** `assets/board/table-leather.jpg` (1024², 약 120KB). 황갈색 스웨이드에 꼰 밧줄 테, 위쪽 가운데 매듭
- **각인:** `assets/board/table-emblem.png` (1024×544 투명, 256색, 약 60KB). 더미 양옆에서 바깥을 겨누는 리볼버 두 자루,
  더미와 내 보드 사이의 BANG! (Rye), 둘레에 잎 문양 띠. 가죽에 눌러 찍은 것처럼 그늘·턱을 그렸다
- **그림이 없으면:** 예전 그대로 `#3B2A19` 펠트 × 128² 잡음, 테두리 `Colors.border` (`TableGeometry.ts`)

| 파일 | 하는 일 |
|---|---|
| `src/game/table3d/scene/TableGeometry.ts` | 원판 map 을 가죽으로 갈아 끼우고, 각인 평면을 `layout.center` 에 얹는다 (`EMBLEM`) |
| `src/game/ui/card-art.ts` | `tableLeatherArt()`, `tableEmblemArt()` |
| `docs/table-prototypes/` | 시안 페이지와 굽는 코드. 그림을 다시 뽑을 때 쓴다 |

### 왜 두 장으로 나눴나

원판(`CircleGeometry`)은 정사각 그림의 내접원을 쓰고, 판 크기에 맞춰 늘어난다. 가로 화면은 6.3×4.5,
세로 화면은 4.9×5.5 라 비율이 바뀐다. 글자와 총을 한 장에 같이 구우면 세로 화면에서 찌그러진다.
그래서 늘어나도 티가 안 나는 가죽·밧줄만 원판에 깔고, 비율이 고정돼야 하는 각인은 따로 평면 하나에 얹었다.

### 리소스

- 텍스처 두 장 (GPU 약 4MB + 2MB). 조명 없이 `MeshBasicMaterial` 그대로, 매 프레임 하는 일은 없다
- 비스듬히 보는 판이라 둘 다 `anisotropy = 4` (기기 최대치로 잘린다)
- 가죽·각인은 미리 구운 그림이다. 앱(네이티브)에는 2D 캔버스가 없어서 실행 중에 그리지 않는다

## 각인 배치

1 월드 = 170.67px, 그림 가운데 = 더미 가운데에서 +z 0.45. 가로 화면 판(`layout.ts`, rx 4.3 · ry 2.7) 기준이다.

- 위쪽은 이벤트 카드(z -1.3)와 위 좌석이 차지한다. 그래서 시안과 달리 **글자를 더미 아래**로 내렸다
- 총은 더미(x ±0.85) 바깥 x ±1.75. 손잡이가 더미 칸(±1.29) 밑으로 들어가지 않게 z +0.35
- 잎 띠는 옆 좌석 안쪽 모서리(x ±3.3) 안쪽. 7인 이상이나 세로 화면에서는 일부가 보드 밑으로 들어간다

각인 크기·자리를 바꾸면 `TableGeometry.ts` 의 `EMBLEM` 과 `emblem.html` 의 `GAME_SPEC` 을 같이 고친다.

## 거쳐 온 길

시안은 모두 `docs/table-prototypes/` 에 있다. HTML 한 장씩, 판 카메라 각도를 CSS 3D 로 흉내 내고
실제 보드·카드 그림을 얹어 본다. 숫자 키로 넘기고 `H` 로 카드를 치운다.

1. [탁자 시안 5개](table-prototypes/index.html): 살롱 포커 펠트, 낡은 판자, **안장 가죽**, 수채 지도, 사라페 담요 → 안장 가죽
2. [가죽 변형 6개](table-prototypes/leather.html): 원안, 흑갈색·금실, 셰리던 꽃 각인, **올가미 밧줄·낙인**, 조각 이은 가죽, 탄띠 → 올가미 밧줄
3. [BANG! 문양 5개](table-prototypes/emblem.html): 상자 그림처럼 글자와 총을 가운데에. 낙인, 상자 그림 로고, **가죽 각인**, 금박, 스텐실 → 가죽 각인

공통 코드는 `_kit.js`(그리기 도구·좌석·탭), `_leather.js`(가죽·박음질·콘초), `table.css` 다.
정적 서버는 `.claude/launch.json` 의 `table-prototypes` (포트 8096, 저장소 루트). 카드 그림을 상대 경로로 읽어서
`file://` 로 열면 그림이 빠진다.

## 그림 다시 굽기

```bash
cd docs/table-prototypes
for part in leather emblem; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
    --virtual-time-budget=15000 --dump-dom "file://$PWD/emblem.html?bake=$part" > /tmp/$part.html
done
python3 - <<'EOF'
import base64, io, re
from PIL import Image
def grab(part):
    html = open(f'/tmp/{part}.html').read()
    return Image.open(io.BytesIO(base64.b64decode(re.search(r'base64,([A-Za-z0-9+/=]+)', html).group(1))))
grab('leather').convert('RGB').save('../../assets/board/table-leather.jpg', quality=85, optimize=True, progressive=True)
grab('emblem').quantize(colors=256, method=Image.Quantize.FASTOCTREE).save('../../assets/board/table-emblem.png', optimize=True)
EOF
```

- `?bake=leather` 는 시안의 타원을 정사각에 눌러 담는다. 가로 화면 판에서 다시 늘어나 원래 모양에 가깝게 돌아온다
- `?bake=emblem` 은 `GAME_SPEC` 배치로 각인만 투명하게 그린다
- 256색으로 줄여도 가죽 위에 얹었을 때 차이는 채널당 14 이하다 (128색은 27)
- 글꼴(Rye)을 Google Fonts 에서 받으므로 네트워크가 필요하다
- 새 그림을 넣으면 Metro 를 다시 시작해야 `require.context` 에 잡힌다 (`docs/assets.md`)
