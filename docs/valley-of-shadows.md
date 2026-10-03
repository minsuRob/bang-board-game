# 그림자의 계곡 (The Valley of Shadows) — 카드 원문

원문은 dV Giochi 카드 그림(`https://bang.dvgiochi.com/content/7/cards/07_*.png`)에서 직접 읽었다.
그림은 `assets-source/cards/valley/`, `assets-source/cards/characters/` 에 두고, `node scripts/install-art.mjs` 로 설치한 `assets/cards/` 사본을 커밋한다.

## 플레잉 카드 15종 16장

| kind | 원어 | 색 | 무늬·숫자 | 원문 (영) | 한글 효과 |
|---|---|---|---|---|---|
| ghost | Fantasma / Ghost | 파랑 | 9♠, 10♠ | Play on any eliminated player. That player is back in the game, but cannot gain nor lose life points. | 제거된 플레이어 1명 앞에 놓는다. 그 사람은 게임에 돌아오지만 목숨을 얻지도 잃지도 않는다. |
| lemat | Lemat | 파랑(무기 1) | 4♦ | During your turn, you may use any card in your hand as a BANG! card. | 사정거리 1. 자기 차례에 손의 아무 카드나 뱅!으로 쓸 수 있다. |
| rattlesnake | Serpente a Sonagli / Rattlesnake | 파랑 | 7♥ | Play on any player. At the beginning of his turn, that player "draws!": on Spades, he loses 1 life point. | 아무에게나 놓는다. 그 사람은 차례 시작에 판정해서 ♠면 목숨 1을 잃는다. |
| shotgun | Shotgun | 파랑(무기 1) | K♠ | Each time you hit a player, he must discard a card of his choice from his hand. | 사정거리 1. 내가 누군가를 맞힐 때마다 그 사람은 손패 1장을 골라 버린다. |
| bounty | Taglia / Bounty | 파랑 | 9♣ | Play on any player. If that player is hit by a BANG! card, the player who shot him draws a card from the deck. | 아무에게나 놓는다. 그 사람이 뱅!에 맞으면 쏜 사람이 덱에서 1장 가져온다. |
| bandidos | Bandidos | 갈색 | Q♦ | Each player chooses one: discard 2 cards from his hand (1 if he only has 1) or lose 1 life point. | 다른 모든 플레이어는 손패 2장(1장뿐이면 1장)을 버리거나 목숨 1을 잃는다. |
| escape | Fuga / Escape | 갈색 | 3♥ | May be played out of turn. Avoid the effects of a brown card (other than BANG!) that includes you as a target. | 남의 차례에도 낼 수 있다. 나를 대상에 포함한 갈색 카드(뱅! 제외)의 효과를 피한다. |
| aim | Mira / Aim | 갈색 | 6♣ | Play this card together with a BANG! card. If the target is hit, he loses 2 life points. | 뱅!과 함께 낸다. 표적이 맞으면 목숨 2를 잃는다. |
| poker | Poker | 갈색 | J♥ | All other players discard 1 card from their hands at the same time. If no Ace was discarded, you draw up to 2 of those cards. | 다른 모든 플레이어가 동시에 손패 1장을 버린다. 에이스가 없으면 그중 최대 2장을 가져온다. |
| backfire | Ritorno di Fiamma / Backfire | 갈색 | Q♣ | Counts as a Missed! card. The player who shot is the target of a BANG!. | 빗나감! 1장으로 친다. 쏜 사람이 뱅!의 표적이 된다. |
| saved | Salvo! / Saved! | 갈색 | 5♥ | May be played out of turn. Prevent another player from losing 1 life. If he survives, draw 2 cards from his hand or from the deck (your choice). | 남의 차례에도 낼 수 있다. 다른 플레이어가 목숨 1을 잃는 것을 막는다. 그 사람이 살아남으면 그 사람 손에서 또는 덱에서 2장을 가져온다(고른다). |
| fanning | Sventagliata / Fanning | 갈색 | 2♠ | Counts as your normal one BANG! per turn. Also targets the player of your choice at distance 1 from the first target (if any, excluding you) with a BANG!. | 차례당 한 번인 뱅!으로 친다. 첫 표적에서 거리 1인 사람 1명(있으면, 나 제외)도 뱅!의 표적이 된다. |
| tomahawk | Tomahawk | 갈색 | A♦ | (심벌만) 뱅! + ② | 거리 2 이내(무기 무관)의 1명에게 뱅!. 뱅! 카드가 아니라 횟수를 쓰지 않는다. |
| tornado | Tornado | 갈색 | A♣ | Each player discards a card from their hand (if possible), then draws 2 cards from the deck. | 모두 손패 1장을 버리고(가능하면) 덱에서 2장을 가져온다. |
| lastCall | Ultimo Giro / Last Call | 갈색 | 8♦ | (심벌만) 목숨 +1 | 목숨 1 회복. 맥주가 아니다. |

- 유령 2장의 무늬: 그림은 9♠ 한 장뿐이다. 카드 목록이 "9-10" 이라 두 번째는 10♠ 로 둔다.
- 유령 공식 해설 (VoS 룰 6쪽·Expansion Pack): "A ghost is considered “in play” for all purposes, but has no life points:
  At the end of your turn, you must discard all your hand cards. If Ghost is removed, the ghost exits play again."
  그래서 한글 효과에 "차례가 끝나면 손패를 모두 버린다" 를 붙였다. 승리 판정에서도 남은 사람으로 센다 (EC-130).
- 오른쪽 위 까마귀 표시는 확장판 기호다.

## 캐릭터 8종

| id | 원어 | 목숨 | 원문 (영) | 한글 능력 |
|---|---|---|---|---|
| blackFlower | Black Flower | 4 | Once during your turn, you may use any Clubs card as an extra BANG!. | 자기 차례에 한 번, ♣ 카드 아무거나를 추가 <뱅!>으로 쓸 수 있습니다. |
| coloradoBill | Colorado Bill | 4 | Each time you play a BANG! card, "draw!": on Spades, this shot cannot be avoided. | <뱅!> 카드를 낼 때마다 카드를 펼쳐 ♠가 나오면 그 총알은 피할 수 없습니다. |
| derSpotBurstRinger | Der Spot – Burst Ringer | 4 | Once during your turn, you may use a BANG! card as a Gatling. | 자기 차례에 한 번, <뱅!> 카드를 <기관총>으로 쓸 수 있습니다. |
| evelynShebang | Evelyn Shebang | 4 | You may refuse to draw cards in your draw phase. For each card skipped, shoot a BANG! at a different target in reachable distance. | 카드 가져오기 단계에서 카드를 덜 가져올 수 있습니다. 안 가져온 한 장마다 사정거리 안의 서로 다른 사람에게 <뱅!>을 쏩니다. |
| henryBlock | Henry Block | 4 | Any player drawing or discarding one of your cards (in hand or in play) is the target of a BANG!. | 내 카드(손패든 앞에 놓인 것이든)를 가져가거나 버리게 한 사람은 <뱅!>의 표적이 됩니다. |
| lemonadeJim | Lemonade Jim | 4 | Each time another player plays a Beer card, you may discard any card from hand to also regain 1 life point. | 다른 사람이 <맥주>를 낼 때마다, 손패 1장을 버리고 나도 목숨 1을 회복할 수 있습니다. |
| mickDefender | Mick Defender | 4 | If you are the target of a brown card other than BANG!, you may use a Missed! card to avoid that card. | <뱅!>이 아닌 갈색 카드의 대상이 되면 <빗나감!>을 내서 그 카드를 피할 수 있습니다. |
| tucoFranziskaner | Tuco Franziskaner | 5 | During your draw phase, if you have no blue cards in play, draw 2 extra cards. | 카드 가져오기 단계에 앞에 놓인 파랑 카드가 없으면 2장을 더 가져옵니다. |
