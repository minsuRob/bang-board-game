# 뱅! (BANG!) — SC2 Arcade 3/86515 수집 자료

출처: https://sc2arcade.com/map/3/86515  ·  수집일 2026-09-10  ·  battlenet:://starcraft/map/3/86515

## ⚠️ .SC2Map 아카이브는 받지 못했습니다

SC2Arcade는 **맵 제작자가 "Allow for downloading of public map files" 설정을 켠 경우에만**
아카이브 다운로드 링크를 노출합니다. 이 맵의 제작자(WillyTheKid)는 그 설정이 꺼져 있어
API가 `archiveHash`/`headerHash`를 전부 `null`로 내려줍니다.

Blizzard depot(`https://kr-s2-depot.classic.blizzard.com/<sha256>.s2ma`)은 공개돼 있지만
파일 주소가 아카이브의 SHA-256 해시 그 자체라서, 해시 없이는 접근할 방법이 없습니다.
(검증: 같은 사이트의 다른 유저맵 2/208271은 해시가 노출되어 다운로드 가능,
Direct Strike 1/208271은 이 맵과 동일하게 차단)

### 실제로 받을 수 있는 방법
SC2 클라이언트는 아케이드 맵을 플레이할 때 아카이브를 로컬에 캐시합니다.
- macOS: `~/Library/Application Support/Blizzard/StarCraft II/Cache/<xx>/<yy>/<hash>.s2ma`
- Windows: `%LOCALAPPDATA%\Blizzard\StarCraft II\Cache\...`

SC2(무료)를 설치하고 아케이드에서 이 맵에 한 번 접속하면 약 49.8 MB 짜리
`.s2ma` 파일이 생기고, 확장자를 `.SC2Map`으로 바꾸면 에디터로 열립니다.
※ 이 Mac에는 SC2가 설치돼 있지 않아 캐시가 없었습니다.
※ 다만 맵이 잠겨 있으면(대부분의 인기 아케이드 맵) 트리거/데이터는 열람되지 않습니다.

---

## 대신 수집한 것 (아카이브 없이 뽑아낼 수 있는 전부)

| 항목 | 내용 |
|---|---|
| 맵 이름 | 뱅! (작성자 WillyTheKid, 장르 PUZZLE, 최대 8인) |
| 최초 게시 | 2014-08-11 |
| 최종 갱신 | 2025-01-30 (v0.572) |
| 평점 | 3.801 / 5 (382개 리뷰) |
| 현재 용량 | 49.8 MB |
| 웹사이트 | http://cafe.naver.com/w3mar |

### 디렉터리
```
raw/                     원본 API 응답 (map, versions, dependencies, stats, reviews, player_base)
versions/v0.N.json       572개 전 버전의 맵 헤더 전문 (속성·변형·의존성·스크린샷·문자열 참조)
depot/s2ml/              Blizzard depot에서 직접 받은 문자열 테이블 150개 (XML, 한국어 원문)
images/                  아이콘/썸네일/미니맵/게임설명 스크린샷 23장
analysis/                가공 산출물
```

### analysis/
- `version_timeline.csv` — 572개 버전 전체: 날짜, 파일명, 용량, 증감, 의존성, 변형 수
- `milestones.json` — 파일명 53회 · 의존성 12회 · 변형 17회 변경 시점
- `new_strings_by_version.json` — 버전별로 **새로 등장한 게임 텍스트** (144개 버전, 누적 919개 고유 문자열) → 기능 추가 시점 추적용
- `strings_current_v0.572.txt` — 최신 버전 문자열 테이블 99개
- `lobby_config_v0.572.md` — 로비 옵션(속성/변형) 구조 해설
- `reviews_summary.md` — 리뷰 382건 별점 분포·연도별 추이·상위 리뷰
- `player_base.md` — 상위 1000명 플레이 통계

### 의존성 체인
- Core (Mod) (1) v1.30 — 0.0 MB ✅다운로드 가능
- Teams 08 (Mod) (10) v1.24 — 0.0 MB ✅다운로드 가능
- Liberty (Mod) (2) v1.77 — 0.0 MB ✅다운로드 가능
- Liberty (Campaign) (20) v1.52 — 0.0 MB ✅다운로드 가능
- Swarm (Mod) (67130) v1.47 — 0.0 MB ✅다운로드 가능
- Swarm (Campaign) (67132) v1.39 — 0.0 MB ✅다운로드 가능
- WTK_Movie_Talk (160751) v0.2 — 1.9 MB ❌해시 비공개
- WTK_BGM_A1 (161917) v0.2 — 98.2 MB ❌해시 비공개
- 뱅! (86515) v0.572 — 49.8 MB ❌해시 비공개

블리자드 공식 Mod 6종은 해시가 공개돼 있어 depot에서 바로 받을 수 있습니다.
작성자 본인 Mod 2종(WTK_Movie_Talk, WTK_BGM_A1)과 본체는 동일하게 차단돼 있습니다.
