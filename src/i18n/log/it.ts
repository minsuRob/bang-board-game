import { SUIT_GLYPH } from '../../game/data/types';
import type { LogRenderer } from './types';

const carte = (n: number) => (n === 1 ? '1 carta' : `${n} carte`);
const pepite = (n: number) => (n === 1 ? '1 pepita' : `${n} pepite`);
const puntiVita = (n: number) => (n === 1 ? '1 punto vita' : `${n} punti vita`);

/**
 * Registro in italiano. I nomi di carte e personaggi vengono da content/it.ts.
 * Le frasi evitano participi che concordano con il genere del soggetto (i personaggi possono essere donne).
 */
export const itLog: LogRenderer = {
  legacy: () => '',
  gameStart: (m, c) => `${m.count} giocatori si sono seduti. Lo Sceriffo è ${c.nick(m.sheriff)}. Scegliete il personaggio.`,
  reshuffle: (m) => `Gli scarti (${carte(m.amount)}) sono stati rimescolati in un nuovo mazzo.`,
  goldReshuffle: (m) => `Gli equipaggiamenti scartati (${carte(m.amount)}) sono stati rimescolati in un nuovo mazzo.`,
  rejected: (m) => `Azione non consentita, ignorata (${m.action}).`,
  timeout: () => "Tempo scaduto: è stata eseguita l'azione predefinita.",
  turnStart: (m, c) => `Turno di ${c.who(m.who)}.`,
  extraTurn: (m, c) => `${c.who(m.who)} gioca un altro turno.`,
  event: (m, c) => `${m.by ? `${c.who(m.by)} prende il mazzo. ` : ''}Evento rivelato — ${c.n.eventName(m.event)}`,
  gameEnd: (m, c) => {
    const who = m.byPlayer ? m.ids.map((id) => c.nick(id)).join(' · ') : m.roles.map((r) => c.n.roleName(r)).join(' · ');
    const why = c.n.resultReason({ reason: m.reason, winnerIds: m.ids }, c.players);
    return who ? `Vittoria: ${who}. ${why}` : `Nessun vincitore. ${why}`;
  },
  draftPick: (m, c) => `${c.nick(m.who)} ha scelto il personaggio.`,
  draftDone: (m, c) =>
    `Tutti hanno scelto. ${m.picks.map((p) => `${c.nick(p.who)} · ${c.n.charName(p.character)}`).join(', ')}`,

  played: (m, c) => {
    const card = m.as ? `${c.n.cardName(m.card)} come ${c.n.cardName(m.as)}` : c.n.cardName(m.card);
    return (
      `${c.who(m.who)} ha giocato ${card}${m.again ? ' ancora una volta' : ''}${m.ricochet ? ` con ${c.n.eventName('ricochet')}` : ''}` +
      (m.to ? ` → ${c.who(m.to)}.` : '.')
    );
  },
  playedWith: (m, c) =>
    `${c.who(m.who)} ha giocato anche ${c.n.cardName(m.card)}${m.sniper ? ` (${c.n.eventName('sniper')})` : ''}.`,
  discard: (m, c) =>
    m.onDeck ? `${c.who(m.who)} mette una carta coperta in cima al mazzo.` : `${c.who(m.who)} scarta una carta.`,
  draw: (m, c) =>
    m.fromDiscard > 0
      ? `${c.who(m.who)} pesca ${carte(m.fromDiscard)} dagli scarti` +
        (m.fromDeck ? ` e ${carte(m.fromDeck)} dal mazzo.` : '.')
      : `${c.who(m.who)} pesca ${carte(m.fromDeck)}.`,
  steal: (m, c) => `${c.who(m.who)} prende ${carte(m.amount)} dalla mano di ${c.who(m.from)}.`,
  panic: (m, c) =>
    !m.card
      ? `${c.who(m.who)} prende una carta a ${c.who(m.target)}.`
      : m.fromHand
        ? `${c.who(m.who)} prende "${c.n.cardName(m.card)}" dalla mano di ${c.who(m.target)}.`
        : `${c.who(m.who)} prende ${c.n.cardName(m.card)} a ${c.who(m.target)}.`,
  catBalou: (m, c) =>
    m.fromHand
      ? `${c.who(m.who)} fa scartare "${c.n.cardName(m.card)}" dalla mano di ${c.who(m.target)}.`
      : `${c.who(m.who)} fa scartare ${c.n.cardName(m.card)} a ${c.who(m.target)}.`,
  generalStore: (m, c) => `${c.n.cardName('generalStore')}: ${carte(m.amount)} scoperte.`,
  generalStorePick: (m, c) => `${c.who(m.who)} sceglie ${c.n.cardName(m.card)} da ${c.n.cardName('generalStore')}.`,

  missed: (m, c) => `${c.who(m.who)} schiva il colpo.`,
  playMissed: (m, c) =>
    m.backfireTo
      ? `${c.who(m.who)} gioca ${c.n.cardName('backfire')}. Il colpo torna a ${c.who(m.backfireTo)}.`
      : `${c.who(m.who)} gioca ${c.n.cardName(m.card === 'backfire' ? 'backfire' : 'missed')}.`,
  ghostImmune: (m, c) =>
    `${c.who(m.who)} è un fantasma: ${m.from === 'bullet' ? 'i proiettili non hanno effetto' : 'non subisce danni'}.`,
  indiansBang: (m, c) => `${c.who(m.who)} scarta un ${c.n.cardName('bang')} e respinge gli Indiani.`,
  duelBang: (m, c) => `${c.who(m.who)} gioca ${c.n.cardName('bang')} nel duello.`,
  duelLoss: (m, c) => `${c.who(m.who)} perde il duello.`,
  damage: (m, c) => `${c.who(m.who)} perde ${puntiVita(m.amount)} (ne restano ${m.left}).`,
  heal: (m, c) => `${c.who(m.who)} recupera vita (${m.hp}).`,
  beerSurvive: (m, c) => `${c.who(m.who)} beve una ${c.n.cardName('beer')} e resiste.`,
  eliminate: (m, c) => `Eliminazione di ${c.who(m.who)}. Ruolo: ${c.n.roleName(m.role)}.`,
  bounty: (m, c) => `${c.who(m.who)} elimina un ${c.n.roleName('outlaw')} e pesca ${carte(m.cards)} di ricompensa.`,
  penalty: (m, c) =>
    `Lo ${c.n.roleName('sheriff')} ha sparato a un ${c.n.roleName('deputy')}. ${c.who(m.who)} perde tutta la mano e tutto l'equipaggiamento.`,

  judgement: (m, c) => `${c.who(m.who)}: ${c.n.judgementName(m.purpose)} — estrai! ${m.rank}${SUIT_GLYPH[m.suit]}`,
  dodge: (m, c) => `${c.n.judgementName(m.purpose)} vale un ${c.n.cardName('missed')}.`,
  rattlesnake: (m, c) => `${c.n.cardName('rattlesnake')} morde ${c.who(m.who)}.`,
  dynamite: (m, c) => `${c.n.cardName('dynamite')} esplode! ${c.who(m.who)} perde 3 punti vita.`,
  dynamitePass: (m, c) => `${c.n.cardName('dynamite')} passa a ${c.who(m.to)}.`,
  jailEscape: (m, c) => `${c.who(m.who)} evade dalla ${c.n.cardName('jail')}.`,
  jailSkip: (m, c) => `${c.who(m.who)} è in ${c.n.cardName('jail')} e salta il turno.`,
  blackJack: (m, c) =>
    `Seconda carta di ${c.who(m.who)} ${SUIT_GLYPH[m.suit]} ${m.bonus ? '— una carta in più!' : '— nessuna carta in più'}`,

  sidKetchum: (m, c) => `${c.who(m.who)} scarta 2 carte e recupera 1 punto vita.`,
  garyLooter: (m, c) => `${c.who(m.who)} prende la carta scartata da ${c.who(m.from)}.`,
  vultureSam: (m, c) => `${c.who(m.who)} prende ${carte(m.amount)} da ${c.who(m.from)}.`,
  flintWestwood: (m, c) => `${c.who(m.who)} dà 1 carta a ${c.who(m.target)} e ne prende ${m.amount}.`,
  discardSameName: (m, c) =>
    `${c.who(m.who)} gioca ${c.n.cardName(m.card)}: le carte uguali davanti a ${m.owners.map((id) => c.who(id)).join(' · ')} vengono scartate.`,
  pedroRamirez: (m, c) => `${c.who(m.who)} prende ${c.n.cardName(m.card)} dagli scarti.`,
  johnPain: (m, c) => `${c.who(m.who)} prende in mano ${c.n.cardName(m.card)}, appena scoperta.`,
  coloradoBill: () => '♠ — questo colpo non si può schivare.',
  donBell: (m, c) => `${c.who(m.who)} ha estratto un seme rosso e gioca un altro turno.`,
  vendetta: (m, c) => `${c.n.eventName('vendetta')}: ${c.who(m.who)} ha estratto ♥ e gioca un altro turno.`,
  terenKill: (m, c) => `${c.who(m.who)} non cade e resta con 1 punto vita.`,
  bandidosHit: (m, c) => `${c.who(m.who)} tiene le carte e subisce il danno.`,
  bandidosDiscard: (m, c) => `${c.who(m.who)} scarta una carta per ${c.n.cardName('bandidos')}.`,
  evelyn: (m, c) => `${c.who(m.who)} rinuncia a una carta e spara un ${c.n.cardName('bang')} a ${c.who(m.target)}.`,
  lemonadeJim: (m, c) => `${c.who(m.who)} scarta una carta e beve anche lui.`,
  dutchWill: (m, c) => `${c.who(m.who)} scarta una carta e riceve 1 pepita.`,
  youlGrinner: (m, c) => `${c.who(m.who)} dà una carta a ${c.who(m.to)}.`,
  borrowCharacters: (m, c) =>
    `${c.who(m.who)} prende in prestito le abilità di ${m.characters.map((id) => c.n.charName(id)).join(', ')}.`,
  borrowKeep: (m, c) => `${c.who(m.who)} tiene le abilità prese in prestito.`,
  evade: (m, c) =>
    `${c.who(m.who)} gioca ${c.n.cardName(m.card)} ed evita l'effetto di ${c.n.cardName(m.from)}.`,
  saved: (m, c) => `${c.who(m.who)} salva 1 punto vita di ${c.who(m.target)} con ${c.n.cardName('saved')}.`,
  ricochetSave: (m, c) => `${c.who(m.who)} protegge la carta con ${c.n.cardName('missed')}.`,
  ricochetHit: (m, c) => `${c.n.eventName('ricochet')}: ${c.n.cardName(m.card)} davanti a ${c.who(m.target)} viene scartata.`,

  ghostRise: (m, c) => `${c.who(m.who)} ${m.fromCard ? 'torna' : 'risorge'} come fantasma.`,
  ghostLeave: (m, c) => `Il fantasma di ${c.who(m.who)} svanisce.`,
  ghostDiscard: (m, c) => `${c.who(m.who)} è un fantasma e scarta tutta la mano (${carte(m.amount)}) a fine turno.`,

  newIdentityKeep: (m, c) => `${c.who(m.who)} mantiene la propria identità.`,
  newIdentitySwap: (m, c) => `${c.n.charName(m.from)} cambia identità in ${c.n.charName(m.to)} (2 punti vita).`,
  declareSuit: (m, c) => `${c.who(m.who)} dichiara il seme ${SUIT_GLYPH[m.suit]}.`,
  daltons: (m, c) => `${c.n.eventName('theDaltons')}: ${c.who(m.who)} scarta ${c.n.cardName(m.card)}.`,
  missSusanna: (m, c) =>
    `${c.n.eventName('missSusanna')}: ${c.who(m.who)} ha giocato solo ${carte(m.played)} e perde 1 punto vita.`,
  deadMan: (m, c) => `${c.who(m.who)} torna dal regno dei morti (${puntiVita(m.hp)}).`,
  fistfulBang: (m, c) => `${c.n.eventName('fistfulOfCards')}: ${c.who(m.who)} viene colpito da ${c.n.cardName('bang')} (ne restano ${m.left}).`,
  russianRoulette: (m, c) => `${c.n.eventName('russianRoulette')}: ${c.who(m.who)} scarta un ${c.n.cardName('missed')}.`,
  rouletteLoss: (m, c) =>
    `${c.n.eventName('russianRoulette')}: ${c.who(m.who)} non può scartare un ${c.n.cardName('missed')} e perde 2 punti vita.`,
  bloodBrothers: (m, c) => `${c.n.eventName('bloodBrothers')}: ${c.who(m.who)} cede 1 punto vita a ${c.who(m.to)}.`,
  hardLiquor: (m, c) => `${c.n.eventName('hardLiquor')}: ${c.who(m.who)} rinuncia a pescare e recupera vita.`,
  peyote: (m, c) => {
    const said = m.color === 'red' ? 'rosso' : 'nero';
    return m.right
      ? `${c.n.eventName('peyote')}: ${c.who(m.who)} indovina ${said} e prende la carta.`
      : `${c.n.eventName('peyote')}: ${c.who(m.who)} dice ${said} ma sbaglia.`;
  },
  peyoteStop: (m, c) => `${c.n.eventName('peyote')}: ${c.who(m.who)} smette di indovinare.`,
  ranch: (m, c) => `${c.n.eventName('ranch')}: ${c.who(m.who)} scarta ${carte(m.amount)} e ne pesca di nuove.`,
  lawOfTheWest: (m, c) => `${c.n.eventName('lawOfTheWest')}: ${c.who(m.who)} mostra la seconda carta pescata.`,
  ladyRose: (m, c) =>
    `${c.n.eventName('ladyRoseOfTexas')}: ${c.who(m.who)} scambia il posto con ${c.who(m.other)}. ${c.who(m.other)} salta il prossimo turno.`,
  ladyRoseSkip: (m, c) => `${c.who(m.who)} ha perso il posto e salta questo turno.`,
  dorothyRage: (m, c) =>
    `${c.n.eventName('dorothyRage')}: ${c.who(m.who)} fa giocare ${c.n.cardName(m.card)} a ${c.who(m.forced)}${m.to ? ` → ${c.who(m.to)}` : ''}.`,
  dorothyRageMiss: (m, c) =>
    `${c.who(m.who)} non può giocare ${c.n.cardName(m.card)} e mostra la mano a tutti: ${m.hand.length ? m.hand.map((k) => c.n.cardName(k)).join(', ') : 'nessuna carta'}.`,
  darlingValentine: (m, c) =>
    `${c.n.eventName('darlingValentine')}: ${c.who(m.who)} scarta ${carte(m.amount)} e ne pesca di nuove.`,
  helenaKeep: (_m, c) => `${c.n.eventName('helenaZontero')}: seme nero, i ruoli restano uguali.`,
  rolesShuffled: (_m, c) => `${c.n.eventName('helenaZontero')}: i ruoli dei giocatori in vita, tranne lo ${c.n.roleName('sheriff')}, sono stati rimescolati e ridistribuiti.`,
  boneOrchard: (m, c) =>
    `${c.n.eventName('boneOrchard')}: ${c.who(m.who)} torna con 1 punto vita e riceve un nuovo ruolo tra quelli degli eliminati.`,

  pokerBet: (m, c) => `${c.who(m.who)} mette 1 carta coperta per ${c.n.cardName('poker')}.`,
  pokerReveal: (m, c) =>
    m.ace ? `${c.n.cardName('poker')}: è uscito un Asso, tutte le carte vengono scartate.` : `${c.n.cardName('poker')}: nessun Asso.`,
  pokerTake: (m, c) => `${c.who(m.who)} prende ${c.n.cardName(m.card)} dal piatto.`,
  tornadoDiscard: (m, c) => `${c.who(m.who)} scarta una carta per ${c.n.cardName('tornado')}.`,
  shotgun: (m, c) => `${c.n.cardName('shotgun')}: ${c.who(m.who)} scarta 1 carta.`,

  nugget: (m, c) => `${c.who(m.who)} riceve ${pepite(m.amount)}.`,
  buyGold: (m, c) => `${c.who(m.who)} compra ${c.n.goldName(m.gold)} per ${pepite(m.price)}.`,
  removeGold: (m, c) =>
    `${c.who(m.who)} paga ${pepite(m.price)} per far scartare ${c.n.goldName(m.gold)} a ${c.who(m.target)}.`,
  beerForGold: (m, c) => `${c.who(m.who)} cambia una ${c.n.cardName('beer')} con 1 pepita.`,
  goldAbility: (m, c) =>
    `${c.who(m.who)} paga ${pepite(m.cost)}: ${c.n.abilityLabel(m.ability)}` + (m.to ? ` → ${c.who(m.to)}.` : '.'),
  goldDup: (m, c) => `${c.who(m.who)} ha già ${c.n.goldName(m.gold)} e la scarta.`,
  goldAs: (m, c) =>
    `${c.who(m.who)} usa ${c.n.goldName(m.gold)} come ${c.n.cardName(m.as)}` + (m.to ? ` → ${c.who(m.to)}.` : '.'),
  goldRush: (m, c) => `${c.who(m.who)} recupera tutti i punti vita e giocherà un altro turno dopo questo.`,
  wantedPlaced: (m, c) => `${c.n.goldName('wanted')} viene posta davanti a ${c.who(m.to)}.`,
  wanted: (m, c) => `Il ricercato è stato preso. ${c.who(m.who)} riceve 2 carte e 1 pepita.`,
  rhum: (m, c) => `${c.n.goldName('rhum')}: ${carte(m.count)} scoperte, ${m.suits === 1 ? '1 seme' : `${m.suits} semi`}.`,
  joshDraw: (m, c) => `Pescata ${c.n.goldName(m.gold)} dal mazzo equipaggiamento.`,
};
