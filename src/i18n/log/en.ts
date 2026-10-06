import { SUIT_GLYPH } from '../../game/data/types';
import type { LogRenderer } from './types';

const cards = (n: number) => (n === 1 ? '1 card' : `${n} cards`);
const nuggets = (n: number) => (n === 1 ? '1 gold nugget' : `${n} gold nuggets`);
const lifePoints = (n: number) => (n === 1 ? '1 life point' : `${n} life points`);

/** English log. Card and character names come from the official English names (content/en.ts) */
export const enLog: LogRenderer = {
  legacy: () => '',
  gameStart: (m, c) => `${m.count} players sat down. The Sheriff is ${c.nick(m.sheriff)}. Choose your characters.`,
  reshuffle: (m) => `The discard pile (${cards(m.amount)}) was shuffled into a new deck.`,
  goldReshuffle: (m) => `The discarded equipment (${cards(m.amount)}) was shuffled into a new equipment deck.`,
  rejected: (m) => `That action is not allowed and was ignored (${m.action}).`,
  timeout: () => 'Time ran out, so the default action was taken.',
  turnStart: (m, c) => `${c.who(m.who)}'s turn.`,
  extraTurn: (m, c) => `${c.who(m.who)} takes another turn.`,
  event: (m, c) => `${m.by ? `${c.who(m.by)} took the pile. ` : ''}Event revealed — ${c.n.eventName(m.event)}`,
  gameEnd: (m, c) => {
    const who = m.byPlayer ? m.ids.map((id) => c.nick(id)).join(' · ') : m.roles.map((r) => c.n.roleName(r)).join(' · ');
    const why = c.n.resultReason({ reason: m.reason, winnerIds: m.ids }, c.players);
    return who ? `${who} won. ${why}` : `No winner. ${why}`;
  },
  draftPick: (m, c) => `${c.nick(m.who)} chose a character.`,
  draftDone: (m, c) => `Everyone has chosen. ${m.picks.map((p) => `${c.nick(p.who)} · ${c.n.charName(p.character)}`).join(', ')}`,

  played: (m, c) => {
    const card = m.as ? `${c.n.cardName(m.card)} as ${c.n.cardName(m.as)}` : c.n.cardName(m.card);
    return (
      `${c.who(m.who)} played ${card}${m.again ? ' again' : ''}${m.ricochet ? ` with ${c.n.eventName('ricochet')}` : ''}` +
      (m.to ? ` → ${c.who(m.to)}.` : '.')
    );
  },
  playedWith: (m, c) =>
    `${c.who(m.who)} also played ${c.n.cardName(m.card)}${m.sniper ? ` (${c.n.eventName('sniper')})` : ''}.`,
  discard: (m, c) =>
    m.onDeck ? `${c.who(m.who)} put a card face down on top of the deck.` : `${c.who(m.who)} discarded a card.`,
  draw: (m, c) =>
    m.fromDiscard > 0
      ? `${c.who(m.who)} drew ${cards(m.fromDiscard)} from the discard pile` +
        (m.fromDeck ? ` and ${cards(m.fromDeck)} from the deck.` : '.')
      : `${c.who(m.who)} drew ${cards(m.fromDeck)}.`,
  steal: (m, c) => `${c.who(m.who)} took ${cards(m.amount)} from ${c.who(m.from)}'s hand.`,
  panic: (m, c) =>
    !m.card
      ? `${c.who(m.who)} took a card from ${c.who(m.target)}.`
      : m.fromHand
        ? `${c.who(m.who)} took "${c.n.cardName(m.card)}" from ${c.who(m.target)}'s hand.`
        : `${c.who(m.who)} took ${c.n.cardName(m.card)} from ${c.who(m.target)}.`,
  catBalou: (m, c) =>
    m.fromHand
      ? `${c.who(m.who)} made ${c.who(m.target)} discard "${c.n.cardName(m.card)}" from their hand.`
      : `${c.who(m.who)} made ${c.who(m.target)} discard ${c.n.cardName(m.card)}.`,
  generalStore: (m, c) => `${c.n.cardName('generalStore')}: ${cards(m.amount)} revealed.`,
  generalStorePick: (m, c) => `${c.who(m.who)} picked ${c.n.cardName(m.card)} from ${c.n.cardName('generalStore')}.`,

  missed: (m, c) => `${c.who(m.who)} dodged the bullet.`,
  playMissed: (m, c) =>
    m.backfireTo
      ? `${c.who(m.who)} played ${c.n.cardName('backfire')}. The bullet goes back to ${c.who(m.backfireTo)}.`
      : `${c.who(m.who)} played ${c.n.cardName(m.card === 'backfire' ? 'backfire' : 'missed')}.`,
  ghostImmune: (m, c) =>
    `${c.who(m.who)} is a ghost, so ${m.from === 'bullet' ? 'bullets have no effect' : 'no damage is taken'}.`,
  indiansBang: (m, c) => `${c.who(m.who)} discarded a ${c.n.cardName('bang')} and fought off the Indians.`,
  duelBang: (m, c) => `${c.who(m.who)} played ${c.n.cardName('bang')} in the duel.`,
  duelLoss: (m, c) => `${c.who(m.who)} lost the duel.`,
  damage: (m, c) => `${c.who(m.who)} lost ${lifePoints(m.amount)} (${m.left} left).`,
  heal: (m, c) => `${c.who(m.who)} regained life (${m.hp}).`,
  beerSurvive: (m, c) => `${c.who(m.who)} drank a ${c.n.cardName('beer')} and survived.`,
  eliminate: (m, c) => `${c.who(m.who)} was eliminated. Role: ${c.n.roleName(m.role)}.`,
  bounty: (m, c) => `${c.who(m.who)} eliminated an ${c.n.roleName('outlaw')} and draws ${cards(m.cards)} as a reward.`,
  penalty: (m, c) =>
    `The ${c.n.roleName('sheriff')} shot a ${c.n.roleName('deputy')}. ${c.who(m.who)} loses their whole hand and all equipment.`,

  judgement: (m, c) => `${c.who(m.who)}: ${c.n.judgementName(m.purpose)} — draw! ${m.rank}${SUIT_GLYPH[m.suit]}`,
  dodge: (m, c) => `${c.n.judgementName(m.purpose)} gives one ${c.n.cardName('missed')}.`,
  rattlesnake: (m, c) => `${c.n.cardName('rattlesnake')} bit ${c.who(m.who)}.`,
  dynamite: (m, c) => `${c.n.cardName('dynamite')} exploded! ${c.who(m.who)} loses 3 life points.`,
  dynamitePass: (m, c) => `${c.n.cardName('dynamite')} passed to ${c.who(m.to)}.`,
  jailEscape: (m, c) => `${c.who(m.who)} escaped from ${c.n.cardName('jail')}.`,
  jailSkip: (m, c) => `${c.who(m.who)} is in ${c.n.cardName('jail')} and skips the turn.`,
  blackJack: (m, c) =>
    `${c.who(m.who)}'s second card is revealed ${SUIT_GLYPH[m.suit]} ${m.bonus ? '— one more card!' : '— no extra card'}`,

  sidKetchum: (m, c) => `${c.who(m.who)} discarded 2 cards and regained 1 life point.`,
  garyLooter: (m, c) => `${c.who(m.who)} took ${c.who(m.from)}'s discarded card.`,
  vultureSam: (m, c) => `${c.who(m.who)} took ${cards(m.amount)} from ${c.who(m.from)}.`,
  flintWestwood: (m, c) => `${c.who(m.who)} gave 1 card to ${c.who(m.target)} and took ${cards(m.amount)}.`,
  discardSameName: (m, c) =>
    `${c.who(m.who)} played ${c.n.cardName(m.card)}, so matching cards in front of ${m.owners.map((id) => c.who(id)).join(' · ')} were discarded.`,
  pedroRamirez: (m, c) => `${c.who(m.who)} took ${c.n.cardName(m.card)} from the discard pile.`,
  johnPain: (m, c) => `${c.who(m.who)} took the revealed ${c.n.cardName(m.card)} into their hand.`,
  coloradoBill: () => '♠ — this bullet cannot be dodged.',
  donBell: (m, c) => `${c.who(m.who)} got a red suit and takes another turn.`,
  vendetta: (m, c) => `${c.n.eventName('vendetta')}: ${c.who(m.who)} got a ♥ and takes another turn.`,
  terenKill: (m, c) => `${c.who(m.who)} does not go down and stays at 1 life point.`,
  bandidosHit: (m, c) => `${c.who(m.who)} kept their cards and took the damage.`,
  bandidosDiscard: (m, c) => `${c.who(m.who)} discarded a card to ${c.n.cardName('bandidos')}.`,
  evelyn: (m, c) => `${c.who(m.who)} gave up a card and shoots a ${c.n.cardName('bang')} at ${c.who(m.target)}.`,
  lemonadeJim: (m, c) => `${c.who(m.who)} discarded a card and had a drink too.`,
  dutchWill: (m, c) => `${c.who(m.who)} discarded a card and received 1 gold nugget.`,
  youlGrinner: (m, c) => `${c.who(m.who)} gave a card to ${c.who(m.to)}.`,
  borrowCharacters: (m, c) =>
    `${c.who(m.who)} borrowed the abilities of ${m.characters.map((id) => c.n.charName(id)).join(', ')}.`,
  borrowKeep: (m, c) => `${c.who(m.who)} keeps the borrowed abilities.`,
  evade: (m, c) =>
    `${c.who(m.who)} played ${c.n.cardName(m.card)} and avoided the effect of ${c.n.cardName(m.from)}.`,
  saved: (m, c) => `${c.who(m.who)} saved 1 life point of ${c.who(m.target)} with ${c.n.cardName('saved')}.`,
  ricochetSave: (m, c) => `${c.who(m.who)} protected the card with ${c.n.cardName('missed')}.`,
  ricochetHit: (m, c) => `${c.n.eventName('ricochet')}: ${c.n.cardName(m.card)} in front of ${c.who(m.target)} was discarded.`,

  ghostRise: (m, c) => `${c.who(m.who)} ${m.fromCard ? 'came back' : 'rose again'} as a ghost.`,
  ghostLeave: (m, c) => `${c.who(m.who)}'s ghost vanished.`,
  ghostDiscard: (m, c) => `${c.who(m.who)} is a ghost and discarded their whole hand (${cards(m.amount)}) at the end of the turn.`,

  newIdentityKeep: (m, c) => `${c.who(m.who)} kept their identity.`,
  newIdentitySwap: (m, c) => `${c.n.charName(m.from)} changed identity to ${c.n.charName(m.to)} (2 life points).`,
  declareSuit: (m, c) => `${c.who(m.who)} declared the suit ${SUIT_GLYPH[m.suit]}.`,
  daltons: (m, c) => `${c.n.eventName('theDaltons')}: ${c.who(m.who)} discarded ${c.n.cardName(m.card)}.`,
  missSusanna: (m, c) =>
    `${c.n.eventName('missSusanna')}: ${c.who(m.who)} played only ${cards(m.played)} and loses 1 life point.`,
  deadMan: (m, c) => `${c.who(m.who)} came back from the dead (${lifePoints(m.hp)}).`,
  fistfulBang: (m, c) => `${c.n.eventName('fistfulOfCards')}: ${c.who(m.who)} is shot at by ${c.n.cardName('bang')} (${m.left} left).`,
  russianRoulette: (m, c) => `${c.n.eventName('russianRoulette')}: ${c.who(m.who)} discarded a ${c.n.cardName('missed')}.`,
  rouletteLoss: (m, c) =>
    `${c.n.eventName('russianRoulette')}: ${c.who(m.who)} could not discard a ${c.n.cardName('missed')} and loses 2 life points.`,
  bloodBrothers: (m, c) => `${c.n.eventName('bloodBrothers')}: ${c.who(m.who)} gave 1 life point to ${c.who(m.to)}.`,
  hardLiquor: (m, c) => `${c.n.eventName('hardLiquor')}: ${c.who(m.who)} skips drawing and regains life.`,
  peyote: (m, c) => {
    const said = m.color === 'red' ? 'red' : 'black';
    return m.right
      ? `${c.n.eventName('peyote')}: ${c.who(m.who)} guessed ${said} and took the card.`
      : `${c.n.eventName('peyote')}: ${c.who(m.who)} called ${said} but was wrong.`;
  },
  peyoteStop: (m, c) => `${c.n.eventName('peyote')}: ${c.who(m.who)} stopped guessing.`,
  ranch: (m, c) => `${c.n.eventName('ranch')}: ${c.who(m.who)} discarded ${cards(m.amount)} and draws new ones.`,
  lawOfTheWest: (m, c) => `${c.n.eventName('lawOfTheWest')}: ${c.who(m.who)} showed the second card drawn.`,
  ladyRose: (m, c) =>
    `${c.n.eventName('ladyRoseOfTexas')}: ${c.who(m.who)} swapped places with ${c.who(m.other)}. ${c.who(m.other)} skips the next turn.`,
  ladyRoseSkip: (m, c) => `${c.who(m.who)} lost their place and skips this turn.`,
  dorothyRage: (m, c) =>
    `${c.n.eventName('dorothyRage')}: ${c.who(m.who)} made ${c.who(m.forced)} play ${c.n.cardName(m.card)}${m.to ? ` → ${c.who(m.to)}` : ''}.`,
  dorothyRageMiss: (m, c) =>
    `${c.who(m.who)} cannot play ${c.n.cardName(m.card)} and showed their hand to everyone: ${m.hand.length ? m.hand.map((k) => c.n.cardName(k)).join(', ') : 'empty'}.`,
  darlingValentine: (m, c) =>
    `${c.n.eventName('darlingValentine')}: ${c.who(m.who)} discarded ${cards(m.amount)} and draws new ones.`,
  helenaKeep: (_m, c) => `${c.n.eventName('helenaZontero')}: a black suit, so the roles stay the same.`,
  rolesShuffled: (_m, c) => `${c.n.eventName('helenaZontero')}: the roles of all living players except the ${c.n.roleName('sheriff')} were shuffled and redealt.`,
  boneOrchard: (m, c) =>
    `${c.n.eventName('boneOrchard')}: ${c.who(m.who)} returned with 1 life point and took a new role from the eliminated players.`,

  pokerBet: (m, c) => `${c.who(m.who)} put 1 card face down in ${c.n.cardName('poker')}.`,
  pokerReveal: (m, c) =>
    m.ace ? `${c.n.cardName('poker')}: an Ace came up, so all were discarded.` : `${c.n.cardName('poker')}: no Ace.`,
  pokerTake: (m, c) => `${c.who(m.who)} took ${c.n.cardName(m.card)} from the pot.`,
  tornadoDiscard: (m, c) => `${c.who(m.who)} discarded a card to ${c.n.cardName('tornado')}.`,
  shotgun: (m, c) => `${c.n.cardName('shotgun')}: ${c.who(m.who)} discarded 1 card.`,

  nugget: (m, c) => `${c.who(m.who)} received ${nuggets(m.amount)}.`,
  buyGold: (m, c) => `${c.who(m.who)} bought ${c.n.goldName(m.gold)} for ${nuggets(m.price)}.`,
  removeGold: (m, c) =>
    `${c.who(m.who)} paid ${nuggets(m.price)} to make ${c.who(m.target)} discard ${c.n.goldName(m.gold)}.`,
  beerForGold: (m, c) => `${c.who(m.who)} traded a ${c.n.cardName('beer')} for 1 gold nugget.`,
  goldAbility: (m, c) =>
    `${c.who(m.who)} paid ${nuggets(m.cost)}: ${c.n.abilityLabel(m.ability)}` + (m.to ? ` → ${c.who(m.to)}.` : '.'),
  goldDup: (m, c) => `${c.who(m.who)} already has ${c.n.goldName(m.gold)} and discarded it.`,
  goldAs: (m, c) =>
    `${c.who(m.who)} used ${c.n.goldName(m.gold)} as ${c.n.cardName(m.as)}` + (m.to ? ` → ${c.who(m.to)}.` : '.'),
  goldRush: (m, c) => `${c.who(m.who)} regained all life points and will take another turn after this one.`,
  wantedPlaced: (m, c) => `${c.n.goldName('wanted')} was placed on ${c.who(m.to)}.`,
  wanted: (m, c) => `The wanted outlaw was caught. ${c.who(m.who)} receives 2 cards and 1 gold nugget.`,
  rhum: (m, c) => `${c.n.goldName('rhum')}: ${cards(m.count)} revealed, ${m.suits === 1 ? '1 suit' : `${m.suits} suits`} came up.`,
  joshDraw: (m, c) => `Took ${c.n.goldName(m.gold)} from the equipment deck.`,
};
