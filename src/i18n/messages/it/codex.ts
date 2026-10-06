import type { Messages } from '../../types-messages';

const ONE_WEAPON = 'Puoi tenere una sola arma. Se ne giochi una nuova, quella che avevi viene scartata.';
const RANGE_ONLY_BANG = 'La distanza dell’arma conta solo per la portata di BANG!. Panico! è sempre a distanza 1, qualunque arma tu abbia.';
const NO_DUPLICATE = 'Non puoi avere davanti a te due carte equipaggiamento con lo stesso nome.';
const DRAW_RESHUFFLE = 'Se il mazzo finisce, mescola gli scarti e continua a pescare.';
const WWS_REVEAL =
  'In una partita con Wild West Show, chi la gioca scopre una nuova carta situazione. Se Lee Van Kliff ripete l’effetto, non la scopre.';

export const codex: Messages['codex'] = {
  tabs: { cards: 'Carte da gioco', characters: 'Personaggi', events: 'Eventi', gold: 'Equipaggiamento Gold', roles: 'Ruoli' },
  sets: {
    base: 'Gioco base',
    highnoon: 'High Noon',
    valley: 'Valle delle Ombre',
    goldrush: 'Gold Rush',
    wildwestshow: 'Wild West Show',
    fistful: 'Un pugno di carte',
  },
  highnoonPromo: 'Promo High Noon',
  sections: {
    brown: 'Uso immediato',
    weapon: 'Armi',
    gear: 'Equipaggiamento',
    goldBrown: 'Marrone · si compra e si usa subito',
    goldBlack: 'Nero · equipaggiamento da tenere davanti',
    roles: 'Ruoli',
  },
  goldCost: (n) => `${n} ${n === 1 ? 'pepita' : 'pepite'}`,
  detail: {
    closeDetail: 'Chiudi i dettagli',
    equip: {
      self: 'Equipaggiamento da mettere davanti a sé',
      other: 'Equipaggiamento da mettere davanti a un altro giocatore',
      eliminated: 'Equipaggiamento da mettere davanti a un giocatore eliminato',
      generic: 'Equipaggiamento',
    },
    weapon: (range) => `Arma · distanza ${range}`,
    instant: 'Uso immediato',
    kind: 'Tipo',
    count: 'Copie',
    sheets: (n) => (n === 1 ? '1 carta' : `${n} carte`),
    spread: (ranks, n) => `${ranks}  (${n === 1 ? '1 carta' : `${n} carte`})`,
    countsAs: 'Vale come',
    countsAsValue: (name) => `Vale anche come carta ${name}`,
    when: 'Quando',
    outOfTurn: 'Si può giocare anche nel turno di un altro',
    fx: 'Effetto',
    hp: 'Punti vita',
    hpValue: (hp) => `${hp} (${hp + 1} se Sceriffo)`,
    order: 'Ordine',
    finalCard: 'L’ultima carta, fissa in fondo al mazzo',
    cost: 'Costo',
    players: 'Giocatori',
    playersCount: (players, count) => `${players} giocatori: ${count}`,
    symbols: 'Simboli',
    ruleNotes: 'Note sulle regole',
    playFx: 'Guarda l’effetto',
    fxHighOnly: 'Effetto solo in alta qualità',
  },
  notes: {
    cards: {
      bang: [
        'Una sola volta per turno. Nessun limite con una Volcanic o con Willy the Kid.',
        'Se Calamity Janet gioca un Mancato! come BANG!, usa quell’unico BANG! del turno.',
        'Le estrazioni di Barile e Jourdonnais sono separate. Se hai entrambi, estrai ancora una volta se la prima fallisce.',
        'Il BANG! di Slab the Killer si schiva solo con 2 carte Mancato!.',
      ],
      missed: [
        'Una per colpo. Anche una Gatling si ferma con una sola.',
        'Indiani! e Duello non si fermano con un Mancato!.',
        'Un Mancato! scoperto da un’estrazione non ha alcun effetto. Le estrazioni guardano solo il seme.',
      ],
      beer: [
        'Giocala nel momento in cui i punti vita arrivano a 0 per sopravvivere. Con 2 o più danni servono abbastanza Birre da tornare ad almeno 1 punto vita.',
        'Se non puoi sopravvivere, non usi nessuna Birra e vieni eliminato.',
        'Con solo 2 giocatori in vita non cura, e non salva neppure dalla morte.',
        'Si può giocare anche a punti vita pieni, ma non ha effetto.',
        'Durante l’evento The Reverend non si può usare nemmeno in punto di morte.',
      ],
      saloon: [
        'Si può usare anche con soli 2 giocatori in vita. Il limite dei 2 giocatori vale solo per la Birra.',
        'Si può usare anche durante l’evento The Reverend.',
      ],
      stagecoach: [DRAW_RESHUFFLE, WWS_REVEAL],
      wellsFargo: [DRAW_RESHUFFLE, WWS_REVEAL],
      generalStore: [
        'Scopre tante carte quanti sono i giocatori in vita ora, non all’inizio.',
        'A partire da chi l’ha giocata, ognuno ne sceglie una in senso orario, e l’ultimo prende la carta rimasta.',
      ],
      gatling: [
        'Colpisce tutti tranne te, a prescindere dalla distanza.',
        'Non è una carta BANG!. Non conta per il BANG! una volta per turno e si può giocare durante The Sermon.',
        'Anche Slab the Killer la ferma con un solo Mancato!.',
        'Ogni bersaglio si difende separatamente. Uno può essere colpito mentre un altro schiva.',
      ],
      indians: [
        'Si ferma solo scartando una carta BANG!. Né un Mancato! né un Barile la fermano.',
        'Calamity Janet può scartare un Mancato! come BANG! per fermarla.',
      ],
      duel: [
        'Scegli chiunque, a prescindere dalla distanza. Il bersaglio scarta per primo un BANG!.',
        'Non si può rispondere con un Mancato! o con un Barile.',
        'L’abilità di Suzy Lafayette non scatta finché il Duello non finisce.',
        'Se perdi un Duello che hai lanciato tu, El Gringo non prende la carta. Bart Cassidy sì.',
      ],
      panic: [
        'Puoi scegliere solo chi è a distanza 1, qualunque sia la portata della tua arma. Mirino e Mustang contano per la distanza.',
        'Puoi prendere anche una Prigione o una Dinamite posta davanti a qualcuno. La carta presa va nella tua mano.',
        'Puoi prendere anche una carta posta davanti a te.',
      ],
      catBalou: [
        'Scegli chiunque, a prescindere dalla distanza.',
        'Puoi far scartare anche una Prigione o una Dinamite posta davanti a lui. Vale anche per una carta davanti a te.',
      ],
      volcanic: ['Puoi giocare BANG! senza limiti. In cambio, la distanza è 1.', ONE_WEAPON],
      schofield: [ONE_WEAPON, RANGE_ONLY_BANG],
      remington: [ONE_WEAPON, RANGE_ONLY_BANG],
      carabine: [ONE_WEAPON, RANGE_ONLY_BANG],
      winchester: [ONE_WEAPON, RANGE_ONLY_BANG],
      scope: [
        'La distanza si riduce di 1 solo quando guardi gli altri.',
        'Si somma all’abilità di Rose Doolan. La distanza non scende mai sotto 1.',
        NO_DUPLICATE,
      ],
      mustang: [
        'La distanza aumenta di 1 solo quando gli altri guardano te.',
        'Si somma all’abilità di Paul Regret.',
        NO_DUPLICATE,
      ],
      barrel: [
        'Conta solo il seme della carta scoperta. Anche se esce un Mancato!, fallisce se non è cuori.',
        'Anche se fallisce, puoi comunque fermare il colpo con un Mancato! dalla mano.',
        'Si estrae anche contro una Gatling.',
      ],
      jail: [
        'Non si può mettere allo Sceriffo né a se stessi.',
        'Si estrae all’inizio del turno. Con cuori scappi e giochi normalmente; altrimenti salti l’intero turno, fino alla pesca.',
        'Qualunque sia l’estrazione, la Prigione viene scartata subito.',
        'Se c’è anche una Dinamite, si estrae prima per la Dinamite.',
      ],
      dynamite: [
        'Si estrae all’inizio del turno. Con picche da 2 a 9 esplode e perdi 3 punti vita.',
        'Se non esplode, passa al prossimo giocatore in vita.',
        'Se muori per l’esplosione, non c’è nessuno che ti ha colpito, quindi nessuno incassa la Taglia.',
        'Si estrae prima della Prigione.',
      ],
      fanning: [
        'Il secondo bersaglio è un giocatore a distanza 1 dal primo. Se non c’è, si colpisce solo il primo.',
        'Conta come un BANG! per turno. I due colpi si schivano separatamente.',
      ],
      backfire: [
        'Conta come un Mancato!. Dopo aver parato, spari un BANG! indietro a chi ha sparato.',
        'Se il BANG! rispedito lo uccide, la Taglia va a chi l’ha rispedito.',
      ],
      bounty: [
        'Chi con un BANG! toglie l’ultimo punto vita a qualcuno pesca 1 carta. Duello, Indiani! e Dinamite non contano.',
      ],
      ghost: ['Se perdi la carta Fantasma, vieni subito eliminato di nuovo e scarti tutte le carte rimaste.'],
    },
    characters: {
      bartCassidy: [
        'Peschi 1 carta per ogni punto vita perso. Vale anche senza chi ha sparato, come con la Dinamite, e anche se perdi un Duello che hai lanciato tu.',
      ],
      blackJack: ['La seconda carta è mostrata a tutti. Con cuori o quadri, pesca 1 carta in più.'],
      calamityJanet: [
        'Giocare un Mancato! come BANG! usa l’unico BANG! di quel turno.',
        'Puoi giocare un Mancato! come BANG! anche in Indiani! e Duello.',
        'Le estrazioni guardano solo il seme, quindi questa abilità non conta.',
      ],
      elGringo: [
        'Ogni volta che vieni colpito, prendi 1 carta a caso dalla mano di chi ti ha colpito. Se non ha carte in mano, non succede nulla.',
        'Non ne prendi per i danni della Dinamite o per un Duello perso che hai lanciato tu.',
      ],
      jesseJones: ['Solo la prima carta si prende a caso dalla mano di un altro; la seconda viene dal mazzo.'],
      jourdonnais: [
        'Estrai anche senza Barile. Se hai anche il Barile, estrai ancora una volta se la prima estrazione fallisce.',
      ],
      kitCarlson: [
        'Guarda 3 carte e scegline 2. La carta rimasta torna in cima al mazzo.',
        'Con Thirst ne guardi 3 e ne tieni solo 1; con Train Arrival non scegli e prendi le prime 3.',
      ],
      luckyDuke: ['A ogni estrazione scopri 2 carte e scegli quella che vuoi. Entrambe vengono scartate.'],
      paulRegret: ['Si somma al Mustang. I punti vita massimi sono 3.'],
      pedroRamirez: [
        'Prendi la prima carta degli scarti e la seconda dal mazzo. Se gli scarti sono vuoti, 2 dal mazzo.',
      ],
      roseDoolan: ['Si somma al Mirino. La distanza non scende mai sotto 1.'],
      sidKetchum: [
        'Scegli tu le 2 carte da scartare. Funziona anche in punto di morte, e il limite dei 2 giocatori e l’evento The Reverend non lo bloccano.',
      ],
      slabTheKiller: ['Vale solo per le carte BANG!. La Gatling si ferma con 1 Mancato!.'],
      suzyLafayette: [
        'Peschi nel momento in cui la mano arriva a 0 carte. Vale anche se hai svuotato la mano giocando equipaggiamento.',
        'Non scatta mentre un Duello è in corso; peschi dopo la fine del Duello.',
      ],
      vultureSam: ['Prendi tutta la mano di chi è morto e le carte posate davanti a lui.'],
      willyTheKid: ['Nessun limite ai BANG! anche senza Volcanic.'],
    },
    events: {
      blessing: [
        'Ogni carta conta come cuori. Le estrazioni di Barile e Prigione riescono sempre e la Dinamite non esplode.',
      ],
      curse: ['Ogni carta conta come picche. La Dinamite esplode con il solo numero da 2 a 9.'],
      theSermon: [
        'Nel tuo turno non puoi giocare carte BANG!. Fermare Indiani! nel turno di un altro va bene.',
        'La Gatling non è una carta BANG!, quindi si può usare.',
      ],
      theReverend: [
        'La Birra non si può usare neppure in punto di morte. Il Saloon sì.',
        'L’abilità di Sid Ketchum può comunque salvarti.',
      ],
      hangover: ['Tutte le abilità dei personaggi sono spente. Anche le modifiche alla distanza di Paul Regret e Rose Doolan.'],
      ghostTown: [
        'Un giocatore morto torna come fantasma nel suo turno, fa un turno con 3 carte e sparisce di nuovo.',
        'Il fantasma non ha punti vita e non si cura. Può comunque giocare un Saloon per curare gli altri.',
      ],
      thirst: ['Peschi solo 1 carta. Vale anche quando peschi tramite un’abilità di un personaggio.'],
      trainArrival: ['Peschi 1 carta in più. Vale anche quando peschi tramite un’abilità di un personaggio.'],
      shootout: ['Puoi giocare BANG! 2 volte per turno. Con una Volcanic non c’è comunque limite.'],
      theDaltons: ['Succede una sola volta, nel momento in cui viene scoperto.'],
      handcuffs: ['Non riguarda le carte giocate per parare nel turno di un altro.'],
      newIdentity: ['Se cambi, il nuovo personaggio parte con 2 punti vita.'],
      goldRush: ['I turni vanno in senso antiorario. Anche la Dinamite passa in senso antiorario.'],
      highNoon: [
        'L’ultima carta, fissa in fondo al mazzo degli eventi.',
        'Perdi 1 punto vita all’inizio del turno. Viene prima delle estrazioni di Dinamite e Prigione, e nessuno incassa la Taglia.',
      ],
    },
    gold: {
      bottle: ['Il BANG! della Bottiglia non conta per il BANG! una volta per turno. Il Panico! della Bottiglia è a distanza 1.'],
      rucksack: ['Puoi usarlo quando ti chiedono una Birra in punto di morte, e sopravvivi con 1 punto vita.'],
    },
    roles: {
      sheriff: [
        'Rivela subito la sua identità e ha 1 punto vita in più.',
        'Se uccide un Vice, scarta tutta la mano e le carte davanti a sé.',
      ],
      outlaw: ['Chi uccide un Fuorilegge pesca 3 carte dal mazzo. Anche se chi uccide è un Fuorilegge.'],
      renegade: [
        'Per vincere deve restare solo quando muore lo Sceriffo. Se c’è ancora qualcun altro in vita, vincono i Fuorilegge.',
      ],
    },
  },
};
