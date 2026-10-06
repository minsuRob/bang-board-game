import type { Messages } from '../../types-messages';

const ONE_WEAPON = 'You can hold only one weapon. Playing a new one discards the one you had.';
const RANGE_ONLY_BANG = 'Range only applies to how far BANG! reaches. Panic! is always distance 1, whatever your weapon.';
const NO_DUPLICATE = 'You cannot have two equipment cards with the same name in front of you.';
const DRAW_RESHUFFLE = 'If the deck runs out, shuffle the discard pile and keep drawing.';
const WWS_REVEAL =
  'In a Wild West Show game, the player who plays this flips one new situation card. If Lee Van Kliff repeats the effect, it is not flipped.';

export const codex: Messages['codex'] = {
  tabs: { cards: 'Playing cards', characters: 'Characters', events: 'Events', gold: 'Gold equipment', roles: 'Roles' },
  sets: {
    base: 'Base game',
    highnoon: 'High Noon',
    valley: 'Valley of Shadows',
    goldrush: 'Gold Rush',
    wildwestshow: 'Wild West Show',
    fistful: 'A Fistful of Cards',
  },
  highnoonPromo: 'High Noon promo',
  sections: {
    brown: 'Play immediately',
    weapon: 'Weapons',
    gear: 'Equipment',
    goldBrown: 'Brown · buy and use right away',
    goldBlack: 'Black · equipment kept in front of you',
    roles: 'Roles',
  },
  goldCost: (n) => `${n} gold ${n === 1 ? 'nugget' : 'nuggets'}`,
  detail: {
    closeDetail: 'Close details',
    equip: {
      self: 'Equipment placed in front of yourself',
      other: 'Equipment placed in front of another player',
      eliminated: 'Equipment placed in front of an eliminated player',
      generic: 'Equipment',
    },
    weapon: (range) => `Weapon · range ${range}`,
    instant: 'Play immediately',
    kind: 'Type',
    count: 'Copies',
    sheets: (n) => (n === 1 ? '1 card' : `${n} cards`),
    spread: (ranks, n) => `${ranks}  (${n === 1 ? '1 card' : `${n} cards`})`,
    countsAs: 'Counts as',
    countsAsValue: (name) => `Also counts as a ${name} card`,
    when: 'When',
    outOfTurn: 'Can also be played on another player’s turn',
    fx: 'Effect',
    hp: 'Life points',
    hpValue: (hp) => `${hp} (${hp + 1} if Sheriff)`,
    order: 'Order',
    finalCard: 'The last card, fixed at the bottom of the deck',
    cost: 'Cost',
    players: 'Players',
    playersCount: (players, count) => `${players} players: ${count}`,
    symbols: 'Symbols',
    ruleNotes: 'Rule notes',
    playFx: 'Watch effect',
    fxHighOnly: 'Effect needs high quality',
  },
  notes: {
    cards: {
      bang: [
        'Only once per turn. No limit with a Volcanic or as Willy the Kid.',
        'If Calamity Janet plays a Missed! as a BANG!, it uses up that one per turn.',
        'The Barrel and Jourdonnais draws are separate. With both, you draw one more time if the first draw fails.',
        'A BANG! from Slab the Killer takes 2 Missed! cards to dodge.',
      ],
      missed: [
        'One per shot. A Gatling is also stopped by one.',
        'Indians! and Duel cannot be stopped with a Missed!.',
        'A Missed! flipped by a draw has no effect. Draws only look at the suit.',
      ],
      beer: [
        'Play it the moment your life hits 0 to survive. With 2 or more damage, you need enough Beers to get back to at least 1 life.',
        'If you cannot survive, you use no Beer at all and are eliminated.',
        'With only 2 players left, it does not heal, and it cannot save you from death.',
        'You can play it at full life, but it has no effect.',
        'During the Reverend event, it cannot be used even when about to die.',
      ],
      saloon: [
        'It can be used with only 2 players left. The 2-player limit applies only to Beer.',
        'It can also be used during the Reverend event.',
      ],
      stagecoach: [DRAW_RESHUFFLE, WWS_REVEAL],
      wellsFargo: [DRAW_RESHUFFLE, WWS_REVEAL],
      generalStore: [
        'It reveals as many cards as there are players alive now, not at the start.',
        'Starting with the player who played it, each picks one clockwise, and the last player takes the remaining card.',
      ],
      gatling: [
        'It shoots everyone but you, regardless of distance.',
        'It is not a BANG! card. It does not count toward one BANG! per turn and can be played during the Sermon.',
        'Even Slab the Killer is stopped by a single Missed!.',
        'Each target defends separately. One player can be hit while another dodges.',
      ],
      indians: [
        'It can only be stopped by discarding a BANG! card. Missed! or a Barrel does not stop it.',
        'Calamity Janet can discard a Missed! as a BANG! to stop it.',
      ],
      duel: [
        'You target anyone regardless of distance. The target discards BANG! first.',
        'You cannot respond with a Missed! or a Barrel.',
        'Suzy Lafayette’s ability does not trigger until the Duel ends.',
        'If you lose a Duel you started, El Gringo does not take a card. Bart Cassidy does.',
      ],
      panic: [
        'You can only pick someone within distance 1, whatever your weapon range. A Scope and a Mustang count toward distance.',
        'You can also take a Jail or Dynamite lying in front of someone. The card you take goes into your hand.',
        'You can also take a card lying in front of yourself.',
      ],
      catBalou: [
        'You pick anyone regardless of distance.',
        'You can also make them discard a Jail or Dynamite in front of them. A card in front of yourself works too.',
      ],
      volcanic: ['You can play BANG! with no limit. In return, your range is 1.', ONE_WEAPON],
      schofield: [ONE_WEAPON, RANGE_ONLY_BANG],
      remington: [ONE_WEAPON, RANGE_ONLY_BANG],
      carabine: [ONE_WEAPON, RANGE_ONLY_BANG],
      winchester: [ONE_WEAPON, RANGE_ONLY_BANG],
      scope: [
        'Distance shrinks by 1 only when you look at others.',
        'It stacks with Rose Doolan’s ability. Distance never drops below 1.',
        NO_DUPLICATE,
      ],
      mustang: [
        'Distance grows by 1 only when others look at you.',
        'It stacks with Paul Regret’s ability.',
        NO_DUPLICATE,
      ],
      barrel: [
        'Only the suit of the flipped card counts. Even if a Missed! comes up, it fails unless it is a heart.',
        'Even if it fails, you can still stop the shot with a Missed! from your hand.',
        'You also draw against a Gatling.',
      ],
      jail: [
        'You cannot place it on the Sheriff or on yourself.',
        'You draw at the start of your turn. On a heart you escape and play normally; otherwise you skip your whole turn through drawing cards.',
        'Whatever the draw, the Jail is discarded right away.',
        'If a Dynamite is there too, the Dynamite is drawn for first.',
      ],
      dynamite: [
        'You draw at the start of your turn. On a spade 2 to 9 it explodes and you lose 3 life.',
        'If it does not explode, it passes to the next player alive.',
        'If you die from the explosion, nobody shot you, so nobody collects the Bounty.',
        'It is drawn for before the Jail.',
      ],
      fanning: [
        'The second target is one player at distance 1 from the first target. If there is none, only the first target is shot.',
        'It counts as one BANG! per turn. The two shots are defended separately.',
      ],
      backfire: [
        'It counts as a Missed!. After blocking, you fire a BANG! back at the shooter.',
        'If the returned BANG! kills them, the returning player collects the Bounty.',
      ],
      bounty: [
        'The player whose BANG! took someone’s last life draws 1 card. Duel, Indians! and Dynamite do not count.',
      ],
      ghost: ['If you lose the Ghost card, you are eliminated again right away and discard all remaining cards.'],
    },
    characters: {
      bartCassidy: [
        'Draw 1 card per life lost. Works even with no shooter, like Dynamite, and even if you lose a Duel you started.',
      ],
      blackJack: ['The second card is shown to everyone. On a heart or diamond, draw 1 more.'],
      calamityJanet: [
        'Playing a Missed! as a BANG! uses up that turn’s one BANG!.',
        'You can also play a Missed! as a BANG! in Indians! and Duel.',
        'Draws only look at the suit, so this ability does not matter.',
      ],
      elGringo: [
        'Each time you are hit, you take 1 random card from that player’s hand. Nothing happens if they have no hand.',
        'You do not take one for damage from Dynamite or from losing a Duel you started.',
      ],
      jesseJones: ['Only the first card is taken at random from another player’s hand; the second comes from the deck.'],
      jourdonnais: [
        'You draw even without a Barrel. With a Barrel too, you draw one more time if the first draw fails.',
      ],
      kitCarlson: [
        'Look at 3 cards and pick 2. The remaining 1 goes back on top of the deck.',
        'With Thirst you look at 3 and keep only 1; with Train Arrival you do not choose and take the top 3.',
      ],
      luckyDuke: ['On each draw, flip 2 cards and pick the one you want. Both are discarded.'],
      paulRegret: ['It stacks with the Mustang. Max life is 3.'],
      pedroRamirez: [
        'Take the top card of the discard pile, and the second from the deck. If the discard pile is empty, 2 from the deck.',
      ],
      roseDoolan: ['It stacks with the Scope. Distance never drops below 1.'],
      sidKetchum: [
        'You choose the 2 cards to discard. It works even when about to die, and the 2-player limit and the Reverend event do not block it.',
      ],
      slabTheKiller: ['Only applies to BANG! cards. A Gatling is stopped with 1 Missed!.'],
      suzyLafayette: [
        'You draw the moment your hand hits 0 cards. It applies even if you emptied your hand by playing equipment.',
        'It does not trigger while a Duel is in progress; you draw after the Duel ends.',
      ],
      vultureSam: ['Take all of a dead player’s hand and the cards in front of them.'],
      willyTheKid: ['No limit on BANG! even without a Volcanic.'],
    },
    events: {
      blessing: [
        'Every card counts as a heart. Barrel and Jail draws always succeed and Dynamite never explodes.',
      ],
      curse: ['Every card counts as a spade. Dynamite explodes on rank 2 to 9 alone.'],
      theSermon: [
        'You cannot play BANG! cards on your own turn. Stopping Indians! on another player’s turn is fine.',
        'A Gatling is not a BANG! card, so you can use it.',
      ],
      theReverend: [
        'Beer cannot be used even when about to die. The Saloon can.',
        'Sid Ketchum’s ability can still save you.',
      ],
      hangover: ['All character abilities are off. Paul Regret’s and Rose Doolan’s distance changes are off too.'],
      ghostTown: [
        'On their own turn, a dead player returns as a ghost, plays one turn with 3 cards and vanishes again.',
        'A ghost has no life points and cannot heal. They can still play a Saloon to heal others.',
      ],
      thirst: ['You draw only 1 card. The same applies when drawing through a character ability.'],
      trainArrival: ['You draw 1 more card. The same applies when drawing through a character ability.'],
      shootout: ['You can play BANG! 2 times per turn. With a Volcanic there is still no limit.'],
      theDaltons: ['It happens only once, the moment it is revealed.'],
      handcuffs: ['It does not affect cards played to block on another player’s turn.'],
      newIdentity: ['If you swap, the new character starts with 2 life.'],
      goldRush: ['Turns go counterclockwise. Dynamite passes counterclockwise too.'],
      highNoon: [
        'The last card, fixed at the bottom of the event deck.',
        'You lose 1 life at the start of your turn. It comes before Dynamite and Jail draws, and nobody collects the Bounty.',
      ],
    },
    gold: {
      bottle: ['The Bottle’s BANG! does not count toward one BANG! per turn. The Bottle’s Panic! is distance 1.'],
      rucksack: ['You can use it when asked about a Beer while about to die, and survive with 1 life.'],
    },
    roles: {
      sheriff: [
        'Their identity is revealed from the start and they have 1 more life.',
        'If they kill a Deputy, they discard their whole hand and the cards in front of them.',
      ],
      outlaw: ['Whoever kills an Outlaw draws 3 cards from the deck. Even if the killer is an Outlaw.'],
      renegade: [
        'To win, they must be the last one standing when the Sheriff dies. If anyone else is alive, the Outlaws win.',
      ],
    },
  },
};
