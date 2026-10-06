import { eul, ga, ro, wa } from '../../../game/engine/josa';

/** 판 화면: 상태 줄 · 행동 바 · 입력 대기 창 · 가운데 연출 · 골드 러시 · 이벤트 행동 */
export const table = {
  /** 능력 칩 앞에 붙는 말 */
  ability: (label: string) => `능력 · ${label}`,
  cancelW: '취소 (W)',
  cancelEsc: '취소 (Esc)',

  status: {
    won: (reason: string, winners: string[]) => `${reason} — ${winners.join('·')} 승리`,
    draft: (done: number, total: number) => `캐릭터 선택 · ${done}/${total}명 완료`,
    turn: (mine: boolean, name: string, phase: string, round: number) =>
      `${mine ? '내' : `${name}의`} 차례 · ${phase} 단계 · ${round}라운드`,
    phase: { discard: '버리기', draw: '카드 가져오기', play: '카드 사용' },
    over: '게임이 끝났다.',
    draftWaiting: '다른 사람이 고르기를 기다리는 중',
    draftPick: '캐릭터를 고른다',
    waitingReaction: (name: string | undefined) => `${name}의 반응을 기다리는 중`,
    thinking: (name: string) => `${ga(name)} 생각하는 중`,
    discardTo: (hp: number) => `손패를 목숨 수(${hp}장)까지 줄여야 한다`,
    leadAs: (name: string) => `${ro(name)} 낼 상대를 고른다`,
    leadPlain: '지목할 상대를 고른다',
    leadUntargeted: (lead: string, name: string) => `${lead} · 내 자리를 누르면 ${eul(name)} 그대로 낸다 (Esc 취소)`,
    leadOwnEquipment: (lead: string) => `${lead} · 내 자리를 누르면 내 앞의 카드를 고른다 (Esc 취소)`,
    leadEsc: (lead: string) => `${lead} (Esc 취소)`,
    abilityWord: '능력',
    armed: (name: string) => `${ro(name)} 낼 카드를 고른다 (Esc 취소)`,
    mustPlay: (name: string) => `서부의 법 — ${eul(name)} 내야 차례를 마칠 수 있다`,
    pickCard: '낼 카드를 고른다',
  },

  action: {
    endTurn: '차례 마치기 (Q)',
    yes: '그렇게 한다',
    red: '♥♦ 빨강',
    black: '♣♠ 검정',
    pass: '반응하지 않음 (W)',
    seconds: (n: number) => `${n}초`,
  },

  /** 카드 아래 조작 안내 */
  peek: {
    discardHover: '눌러서 버린다',
    discardTap: '한 번 더 누르면 버린다',
    playHover: '눌러서 낸다',
    playTap: '한 번 더 누르면 낸다',
    none: '지금은 낼 수 없다',
  },

  /** 한줌의 카드 이벤트가 여는 뱅! 사용법 */
  eventMode: {
    sniper: { label: '저격수 · 뱅! 2장', status: '함께 버릴 뱅! 한 장을 고르고 상대를 지목한다 (Esc 취소)' },
    ricochet: { label: '리코체 · 앞의 카드 맞히기', status: '버릴 뱅!을 고르고, 노릴 카드가 있는 상대를 지목한다 (Esc 취소)' },
  },
  swapStatus: '줄 카드를 고르고, 맞바꿀 상대를 지목한다 (Esc 취소)',
  repeatLabel: (name: string) => `능력 · ${name} 한 번 더`,
  repeatStatus: (name: string) => `버릴 뱅!을 고른다 — ${eul(name)} 한 번 더 낸다 (Esc 취소)`,

  /** 능력을 지금 못 쓰는 이유 (흐린 칩) */
  blocked: {
    fullHp: '능력 · 목숨이 가득 차서 쓸 수 없음',
    needBrown: '능력 · 갈색 카드를 낸 뒤 뱅!을 버려 한 번 더',
    cannotRepeat: (name: string) => `능력 · ${eul(name)} 다시 낼 수 없음`,
    noBang: (name: string) => `능력 · 뱅!이 없어 ${name} 한 번 더 못 냄`,
  },
  sidAbility: '카드 2장 → 목숨 1',

  /** 같은 카드·같은 대상의 여러 수를 구분하는 말 */
  variant: {
    chooseHow: '어떻게 낼지 고른다',
    playAs: (name: string) => `${ro(name)} 낸다`,
    with: (card: string) => `${eul(card)} 함께`,
    only: (name: string) => `${name}만`,
    alsoTarget: (name: string) => `${name}에게도`,
    onlyOne: '한 명만',
    alsoDiscard: (card: string) => `${eul(card)} 함께 버린다`,
  },
  ricochetPick: {
    title: (name: string) => `리코체 — ${name}`,
    hint: '노릴 카드를 고른다',
  },
  pickDiscard: (need: number) => `버릴 카드 ${need}장을 고른다`,

  /** 입력 대기 창 (제목과 안내) */
  prompt: {
    missed: {
      byPlayer: (name: string) => `${name}의 뱅!`,
      noShooter: '한줌의 카드 — 뱅!',
      needMore: (who: string, n: number) => `${who} — 빗나감 ${n}장이 필요하다`,
      hint: '빗나감!을 내거나 그냥 맞는다',
    },
    indiansBang: { title: '인디언!이 몰려온다', hint: '뱅!을 버리지 않으면 목숨 1을 잃는다' },
    duelBang: { title: (name: string) => `${name}와의 결투`, hint: '뱅!을 내지 못하면 목숨 1을 잃는다' },
    beerToSurvive: { title: '쓰러지기 직전', hint: (n: number) => `맥주 ${n}장을 마시면 버틸 수 있다` },
    judgementChoice: { title: '카드 펼치기', hint: '두 장 중 어느 쪽을 펼칠지 고른다' },
    generalStore: {
      title: '잡화점',
      pokerTitle: '포커 판돈',
      hintPass: '가져갈 카드를 고르거나 그만 가져간다',
      hint: '가져갈 카드를 고른다',
      passLabel: '그만 가져감 (W)',
    },
    kitCarlson: { title: '카드 가져오기', hint: (n: number) => `${n}장을 더 고른다. 남은 카드는 뽑은 순서대로 덱 위로 돌아간다` },
    daltonsDiscard: { title: '달톤 형제', hint: '앞에 놓인 파랑 카드 1장을 버린다' },
    stealCard: {
      title: (name: string) => `${name}의 카드`,
      hintPanic: '가져올 카드를 고른다. 손패는 무작위 1장',
      hintCatBalou: '버리게 할 카드를 고른다. 손패는 무작위 1장',
    },
    jesseJones: { title: '첫 번째 카드를 어디서 가져올까', hint: '남의 손에서 한 장을 뽑거나, 덱에서 뽑는다' },
    pedroRamirez: { title: '버린 더미에서 가져올까', hint: (top: string) => `맨 위: ${top}` },
    newIdentity: { title: '새로운 신분', hint: '예비 캐릭터로 바꾸면 목숨 2로 시작한다' },
    evelyn: {
      title: (n: number) => `이블린 쉬뱅 — 가져올 카드 ${n}장`,
      hint: '1장 대신 쏠 사람을 고르거나, 남은 카드를 그대로 가져온다',
    },
    saved: {
      title: (name: string) => `${ga(name)} 목숨을 잃으려 한다`,
      hint: '구조!를 내면 목숨 1을 지켜 준다. 살아남으면 2장을 가져온다',
    },
    savedReward: {
      title: '구조! 보상',
      hint: (name: string) => `그렇게 한다: ${name}의 손에서 2장 · 반응하지 않음: 덱에서 2장`,
    },
    evade: { title: (name: string, card: string) => `${name}의 ${card}`, hint: '탈출(또는 빗나감!)을 내면 이 카드의 효과를 피한다' },
    discardChoice: {
      title: {
        bandidos: '반디도스!',
        poker: '포커',
        tornado: '토네이도',
        shotgun: '샷건',
        lemonadeJim: '레모네이드 짐',
      },
      more: (title: string, n: number) => `${title} (${n}장 더)`,
      hint: {
        bandidos: (n: number) => `손패 ${n}장을 버리거나, 버리지 않고 목숨 1을 잃는다`,
        poker: '손패 1장을 엎어 낸다. 에이스가 없으면 낸 사람이 가져간다',
        tornado: '손패 1장을 버린다. 그 뒤 2장을 가져온다',
        shotgun: '샷건에 맞았다. 손패 1장을 골라 버린다',
        lemonadeJim: '손패 1장을 버리면 나도 목숨 1을 회복한다',
      },
    },
    declareSuit: { title: '수갑', hint: '이번 차례에 쓸 무늬를 선언한다' },
    dutchWill: { title: '더치 윌', hint: '방금 뽑은 카드 중 버릴 1장을 고른다. 금덩이 1개를 받는다' },
    goldUse: { title: '골드 러시 카드', hint: '이 카드를 어떻게 쓸지 고른다' },
    russianRoulette: {
      title: '러시안 룰렛',
      hint: '빗나감!을 버리지 않으면 목숨 2를 잃고 룰렛이 멈춘다',
      passLabel: '목숨 2를 잃는다 (W)',
    },
    bloodBrothers: {
      title: '의형제',
      hint: '목숨 1을 잃고 고른 사람의 목숨을 1 회복시킨다',
      passLabel: '넘겨주지 않는다 (W)',
    },
    hardLiquor: {
      title: '독한 술',
      hint: '카드를 가져오지 않고 목숨을 1 회복할까',
      passLabel: '카드를 가져온다 (W)',
    },
    peyote: {
      title: '피요테',
      hintAgain: '맞혔다. 다시 색을 부르거나 여기서 그만둔다 (틀려도 잃는 카드는 없다)',
      hint: '덱 맨 위 카드의 색을 맞힌다',
      passLabel: '그만둔다 (W)',
    },
    ranch: {
      title: '목장',
      hintPicked: (n: number) => `${n}장을 골랐다. 더 고르거나 확정한다`,
      hint: '버리고 새로 가져올 카드를 고른다',
      passPicked: (n: number) => `${n}장 바꾼다 (W)`,
      passNone: '바꾸지 않는다 (W)',
    },
    borrowCharacters: {
      title: '그레고리 덱',
      hint: (current: string) => `지금 빌린 능력: ${current} · 새로 2명을 뽑을까`,
      passLabel: '그대로 둔다 (W)',
    },
    giveCard: {
      title: (name: string) => `율 그리너 — ${name}`,
      hint: '손패가 더 많아 카드 1장을 줘야 한다. 줄 카드를 고른다',
    },
    ricochet: {
      title: (name: string) => `리코체 — ${name}`,
      hint: (card: string) => `${eul(card)} 지키려면 빗나감!을 낸다`,
      passLabel: '카드를 내준다 (W)',
    },
  },

  /** 가운데 카드 고르기 창 */
  pick: {
    handCard: (n: number) => `손패 ${n}번째 카드`,
    pressAgain: '한 번 더 누르면 고른다',
    hiddenHint: '뒷면 카드는 손패에서 무작위로 한 장을 고른다',
    hoverHint: '카드에 마우스를 올리면 설명을 본다',
    tapHint: '카드를 누르면 설명을 본다',
  },

  /** 가운데 연출 */
  spot: {
    storeTitle: '잡화점',
    storeWatching: (name: string | undefined) => (name ? `${ga(name)} 고르는 중` : '고르는 중'),
    takeTitle: { catBalou: '캣 벌로우', panic: '강탈', ricochet: '리코체' },
    takenPanic: '손에서 가져간 카드',
    takenDiscard: '손에서 뽑아 버린 카드',
    eventFinal: '마지막 이벤트 공개',
    eventNew: '새 이벤트 공개',
    closePeek: '카드 설명 닫기',
    deputy: '부관',
    needMeta: (title: string, need: string) => `${title} · 필요 ${need}`,
    printedSuit: (printed: string, shown: string) => `  (인쇄 무늬 ${printed} → ${shown})`,
    stampOk: '성공',
    stampFail: '실패',
  },

  /** 펼친 카드 판정. 빈 도장 글은 성공·실패 기본값을 쓴다 */
  reveal: {
    judgement: {
      barrel: { title: '술통 판정', need: '♥', hit: '빗나감 1회', miss: '막지 못했다', hitStamp: '', missStamp: '' },
      jourdonnais: { title: '주르도네 판정', need: '♥', hit: '빗나감 1회', miss: '막지 못했다', hitStamp: '', missStamp: '' },
      dynamite: {
        title: '다이너마이트 판정',
        need: '♠ 2~9',
        hit: '펑! 목숨 3을 잃는다',
        miss: '옆 사람에게 넘어간다',
        hitStamp: '펑!',
        missStamp: '불발',
      },
      jail: { title: '감옥 판정', need: '♥', hit: '탈출', miss: '차례를 건너뛴다', hitStamp: '', missStamp: '' },
      rattlesnake: {
        title: '방울뱀 판정',
        need: '♠',
        hit: '물렸다 — 목숨 1',
        miss: '무사하다',
        hitStamp: '물림',
        missStamp: '무사',
      },
      coloradoBill: { title: '콜로라도 빌', need: '♠', hit: '피할 수 없는 총알', miss: '평범한 뱅!', hitStamp: '', missStamp: '' },
      donBell: { title: '돈 벨', need: '♥ ♦', hit: '차례를 한 번 더', miss: '차례가 끝난다', hitStamp: '', missStamp: '' },
      terenKill: { title: '테렌 킬', need: '♠ 말고', hit: '목숨 1로 버틴다', miss: '쓰러졌다', hitStamp: '', missStamp: '' },
      vendetta: { title: '복수', need: '♥', hit: '차례를 한 번 더', miss: '차례가 끝난다', hitStamp: '', missStamp: '' },
      helenaZontero: {
        title: '헬레나 존테로',
        need: '♥ ♦',
        hit: '역할을 다시 나눈다',
        miss: '역할은 그대로',
        hitStamp: '섞임',
        missStamp: '그대로',
      },
    },
    blackJack: { title: '블랙 잭', need: '♥ ♦', hit: '한 장 더', miss: '그대로', hitStamp: '', missStamp: '' },
    peyote: { title: '피요테', need: '부른 색', hit: '맞혔다', miss: '틀렸다', hitStamp: '', missStamp: '' },
    other: { title: '카드 펼치기', need: '', hit: '성공', miss: '실패', hitStamp: '', missStamp: '' },
    poker: {
      title: '포커',
      need: '에이스가 없어야',
      resultAce: '에이스! 판돈을 모두 버린다',
      resultOk: '판돈에서 2장까지 가져간다',
      stampAce: '꽝',
      stampOk: '성공',
    },
    rum: {
      title: '럼',
      need: '무늬 가짓수만큼 회복',
      result: (n: number) => `목숨 ${n} 회복`,
    },
  },

  /** 골드 러시 패널 */
  gold: {
    panel: '골드 러시',
    title: (n: number) => `골드 러시 · 내 금덩이 ${n}개`,
    shop: '상점',
    equipment: '앞에 놓인 장비',
    amount: (n: number) => `금 ${n}`,
    shopCard: (name: string, cost: number) => `${name} · 금 ${cost}`,
    player: (who: string, n: number) => `${who} — 금 ${n}`,
    use: '사용',
    buy: (name: string, price: number) => `${name} 사기 (금 ${price})`,
    remove: (who: string, name: string, cost: number) => `${who}의 ${name} 치우기 (금 ${cost})`,
    beer: '맥주 → 금덩이 1',
    ability: {
      jackyMurieta: '뱅! (금 2)',
      joshMcCloud: '장비 덱 뽑기 (금 2)',
      raddieSnake: '카드 1장 (금 1)',
      goldPan: '사금채취판 카드 1장 (금 1)',
      rucksack: '배낭 목숨 1 (금 2)',
    } as Record<string, string>,
  },

  /** 와일드 웨스트 쇼 이벤트 행동 */
  event: {
    panel: '이벤트 행동',
    ladyRose: '레이디 로즈 오브 텍사스',
    swapWith: (name: string) => `${wa(name)} 자리 바꾸기`,
    sacagawea: '사카가웨이 — 모두 손패를 펼쳐 놓는다',
    handCount: (name: string, n: number) => `${name} ${n}장`,
    noHand: '손패가 없다',
    hintHover: '이름에 마우스를 올리면 그 사람 손패를 본다',
    hintTap: '이름을 누르면 그 사람 손패를 본다',
    dorothy: '도로시 레이지 — 다른 사람에게 카드를 내게 한다 (차례에 한 번)',
    dorothyHint: '그 카드가 손에 없으면 그 사람이 손패를 모두에게 보여 준다.',
    forceTo: (name: string) => `${name}에게 내게 하기`,
    force: '내게 하기',
  },
};
