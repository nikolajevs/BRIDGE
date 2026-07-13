'use strict';

/*
 * Игровая логика «Бридж».
 * 36 карт, 2–6 игроков, по часовой стрелке.
 *
 * Правила хода (классика):
 *  - класть можно карту той же масти (любого достоинства),
 *    либо карту того же достоинства любой масти;
 *  - Валет кладётся на любую карту (кроме активной цепочки восьмёрок);
 *  - после Валета заказана масть: подходит любая карта этой масти.
 *
 * Особые карты:
 *  - 6: ходом нельзя закончить — игрок сам накрывает её (тянет из прикупа, пока не сможет);
 *  - 7: следующий берёт 1 карту и ходит;
 *  - 8: следующий берёт 2 и пропускает ход, либо кидает свою 8 (штраф растёт по +2);
 *  - 9: обычная карта (кроется той же мастью или другой девяткой);
 *  - Валет: универсальный + заказ масти;
 *  - Дама пик: следующий берёт 5 и пропускает ход;
 *  - Король: 4 короля подряд — последний положивший выигрывает всю партию;
 *  - Туз: следующий пропускает ход.
 *
 * Очки за карты на руках в конце раунда: все по 10, туз — 15.
 * Ровно 125 — обнуление. Больше 125 — выбывание. Играем до последнего.
 */

const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RV = {};
RANKS.forEach((r, i) => { RV[r] = i + 6; });

function cardName(c) { return c.r + c.s; }
function points(c) { return c.r === 'A' ? 15 : 10; }

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s, id: r + s });
  return shuffle(d);
}

class Game {
  constructor(seats) {
    if (seats.length < 2 || seats.length > 6) throw new Error('Нужно от 2 до 6 игроков');
    this.players = seats.map(p => ({
      token: p.token, name: p.name,
      hand: [], score: 0, eliminated: false, connected: true,
    }));
    this.dealer = Math.floor(Math.random() * this.players.length);
    this.round = 0;
    this.log = [];
    this.phase = 'playing'; // playing | roundEnd | over
    this.winner = null;
    this.roundResults = null;
    this.startRound();
  }

  // ---------- служебное ----------

  addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
  }

  idxOf(token) {
    const i = this.players.findIndex(p => p.token === token);
    if (i < 0) throw new Error('Вы не за этим столом');
    return i;
  }

  activePlayers() { return this.players.filter(p => !p.eliminated); }

  nextActiveIdx(i) {
    const n = this.players.length;
    let j = i;
    do { j = (j + 1) % n; } while (this.players[j].eliminated);
    return j;
  }

  top() { return this.discard[this.discard.length - 1]; }

  assertTurn(i) {
    if (this.phase !== 'playing') throw new Error('Сейчас нельзя ходить');
    if (this.turn !== i) throw new Error('Сейчас не ваш ход');
  }

  drawOne() {
    if (this.deck.length === 0) {
      if (this.discard.length > 1) {
        const top = this.discard.pop();
        this.deck = shuffle(this.discard);
        this.discard = [top];
        this.addLog('Прикуп закончился — сброс перетасован');
      } else {
        return null;
      }
    }
    return this.deck.pop();
  }

  drawN(p, n) {
    let k = 0;
    for (let i = 0; i < n; i++) {
      const c = this.drawOne();
      if (!c) break;
      p.hand.push(c);
      k++;
    }
    return k;
  }

  // ---------- раунд ----------

  startRound() {
    this.round++;
    this.deck = makeDeck();
    this.discard = [];
    this.pendingDraw = 0;      // накопленный штраф восьмёрок
    this.pendingSeven = false; // следующий берёт 1 и ходит
    this.pendingQueen = false; // следующий берёт 5 и пропускает
    this.pendingSkip = false;  // следующий пропускает (туз)
    this.mustCoverSix = false; // текущий игрок обязан накрыть шестёрку
    this.drawnCardId = null;   // карта, взятая добровольно в этот ход
    this.jackSuit = null;      // заказанная валетом масть
    this.kingStreak = 0;
    this.roundResults = null;
    this.phase = 'playing';

    for (const p of this.players) p.hand = [];
    if (this.players[this.dealer].eliminated) this.dealer = this.nextActiveIdx(this.dealer);
    const dealerP = this.players[this.dealer];

    for (const p of this.activePlayers()) {
      const n = (p === dealerP) ? 4 : 5;
      for (let k = 0; k < n; k++) p.hand.push(this.deck.pop());
    }

    // «пятая карта» дилера уходит вслепую первой картой на стол
    const blind = this.deck.pop();
    this.discard.push(blind);
    this.addLog(`— Раунд ${this.round}. Раздаёт ${dealerP.name}. Вслепую выходит ${cardName(blind)}`);

    if (blind.r === 'K') this.kingStreak = 1;
    if (blind.r === 'J') this.jackSuit = blind.s;

    this.turn = this.dealer;

    if (blind.r === '6') {
      // дилер сам накрывает свою слепую шестёрку
      this.mustCoverSix = true;
      this.addLog(`${dealerP.name} должен накрыть шестёрку`);
      return;
    }
    if (blind.r === '7') this.pendingSeven = true;
    if (blind.r === '8') { this.pendingDraw = 2; this.addLog('Вслепую вышла восьмёрка — штраф +2'); }
    if (blind.r === 'Q' && blind.s === '♠') this.pendingQueen = true;
    if (blind.r === 'A') this.pendingSkip = true;

    this.advanceTurn();
  }

  nextRound() {
    if (this.phase !== 'roundEnd') throw new Error('Раунд ещё не закончен');
    this.dealer = this.nextActiveIdx(this.dealer);
    this.startRound();
  }

  // ---------- проверка хода ----------

  canPlayCard(card) {
    const top = this.top();
    if (this.pendingDraw > 0) return card.r === '8';       // цепочка восьмёрок
    if (card.r === 'J') return true;                      // валет — универсальный
    if (card.r === top.r) return true;                     // то же достоинство (в т.ч. 9 на 9)
    if (this.jackSuit) return card.s === this.jackSuit;    // заказанная масть — любая карта
    return card.s === top.s;                               // та же масть (любое достоинство)
  }

  // ---------- действия игроков ----------

  playCard(token, cardId, chosenSuit) {
    const i = this.idxOf(token);
    this.assertTurn(i);
    const p = this.players[i];
    const ci = p.hand.findIndex(c => c.id === cardId);
    if (ci < 0) throw new Error('У вас нет такой карты');
    const card = p.hand[ci];

    if (this.pendingDraw > 0 && card.r !== '8') {
      throw new Error('Идёт цепочка восьмёрок — ответить можно только восьмёркой');
    }
    if (this.drawnCardId && this.drawnCardId !== '__none__' && !this.mustCoverSix
        && card.id !== this.drawnCardId) {
      throw new Error('После добора можно сыграть только взятую карту');
    }
    if (!this.canPlayCard(card)) throw new Error('Эту карту сейчас нельзя положить');
    if (card.r === 'J' && !SUITS.includes(chosenSuit)) throw new Error('Выберите масть для валета');

    p.hand.splice(ci, 1);
    this.discard.push(card);
    this.drawnCardId = null;
    this.kingStreak = (card.r === 'K') ? this.kingStreak + 1 : 0;
    this.jackSuit = (card.r === 'J') ? chosenSuit : null;

    let msg = `${p.name} кладёт ${cardName(card)}`;
    if (card.r === 'J') msg += ` и заказывает ${chosenSuit}`;
    this.addLog(msg);

    // 4 короля подряд — мгновенная победа во всей партии
    if (this.kingStreak >= 4) {
      this.phase = 'over';
      this.winner = p.name;
      this.addLog(`Четыре короля подряд! ${p.name} выигрывает всю партию!`);
      return;
    }

    if (card.r === '6') {
      // ход не закончен: игрок обязан накрыть шестёрку
      this.mustCoverSix = true;
      if (p.hand.length === 0 || !p.hand.some(c => this.canPlayCard(c))) {
        this.addLog(`${p.name} должен накрыть шестёрку`);
      }
      return;
    }
    this.mustCoverSix = false;

    if (card.r === '7') this.pendingSeven = true;
    if (card.r === '8') { this.pendingDraw += 2; this.addLog(`Штраф растёт: +${this.pendingDraw}`); }
    if (card.r === 'Q' && card.s === '♠') this.pendingQueen = true;
    if (card.r === 'A') this.pendingSkip = true;

    if (p.hand.length === 0) { this.finishRound(i); return; }
    this.advanceTurn();
  }

  drawCard(token) {
    const i = this.idxOf(token);
    this.assertTurn(i);
    const p = this.players[i];

    if (this.pendingDraw > 0) throw new Error('У вас есть восьмёрка — вы обязаны её положить');

    if (this.mustCoverSix) {
      const c = this.drawOne();
      if (!c) {
        // крайний случай: карт больше нет нигде — шестёрка остаётся
        this.addLog('Карты закончились — шестёрка остаётся непокрытой');
        this.mustCoverSix = false;
        if (p.hand.length === 0) { this.finishRound(i); } else { this.advanceTurn(); }
        return;
      }
      p.hand.push(c);
      this.addLog(`${p.name} берёт карту (накрывает шестёрку)`);
      return;
    }

    if (this.drawnCardId) throw new Error('Вы уже брали карту — сыграйте её или передайте ход');
    const c = this.drawOne();
    if (!c) {
      this.drawnCardId = '__none__'; // взять нечего — разрешаем пас
      this.addLog('Прикуп пуст — взять нечего');
      return;
    }
    p.hand.push(c);
    this.drawnCardId = c.id;
    this.addLog(`${p.name} берёт карту из прикупа`);
  }

  endTurn(token) {
    const i = this.idxOf(token);
    this.assertTurn(i);
    if (this.mustCoverSix) throw new Error('Сначала накройте шестёрку');
    if (!this.drawnCardId) throw new Error('Сначала возьмите карту из прикупа');
    this.drawnCardId = null;
    this.addLog(`${this.players[i].name} пасует`);
    this.advanceTurn();
  }

  resign(token) {
    const i = this.idxOf(token);
    const p = this.players[i];
    if (p.eliminated || this.phase === 'over') return;
    p.eliminated = true;
    this.addLog(`${p.name} покидает игру`);
    const act = this.activePlayers();
    if (act.length === 1) {
      this.phase = 'over';
      this.winner = act[0].name;
      this.addLog(`${act[0].name} — победитель партии!`);
      return;
    }
    if (this.phase === 'playing' && this.turn === i) {
      this.mustCoverSix = false;
      this.drawnCardId = null;
      this.advanceTurn();
    }
  }

  // ---------- смена хода и эффекты ----------

  advanceTurn() {
    this.drawnCardId = null;
    let j = this.turn;
    // цикл завершится: каждый «пропуск» гасит соответствующий флаг
    for (let guard = 0; guard < 64; guard++) {
      j = this.nextActiveIdx(j);
      const q = this.players[j];

      if (this.pendingSkip) {
        this.pendingSkip = false;
        this.addLog(`${q.name} пропускает ход (туз)`);
        continue;
      }
      if (this.pendingQueen) {
        this.pendingQueen = false;
        const k = this.drawN(q, 5);
        this.addLog(`${q.name} берёт ${k} карт (дама пик) и пропускает ход`);
        continue;
      }
      if (this.pendingDraw > 0) {
        if (q.hand.some(c => c.r === '8')) {
          this.turn = j;
          this.addLog(`${q.name} обязан ответить восьмёркой`);
          return;
        }
        const k = this.drawN(q, this.pendingDraw);
        this.pendingDraw = 0;
        this.addLog(`${q.name} берёт ${k} карт (восьмёрки) и пропускает ход`);
        continue;
      }
      if (this.pendingSeven) {
        this.pendingSeven = false;
        const k = this.drawN(q, 1);
        if (k > 0) this.addLog(`${q.name} берёт карту (семёрка) и ходит`);
      }
      this.turn = j;
      return;
    }
    this.turn = j; // страховка, сюда не попадаем
  }

  // ---------- конец раунда и подсчёт ----------

  finishRound(winnerIdx) {
    const w = this.players[winnerIdx];

    // висящие штрафы применяются к следующему игроку до подсчёта очков
    const j = this.nextActiveIdx(winnerIdx);
    const q = this.players[j];
    if (this.pendingDraw > 0) {
      const k = this.drawN(q, this.pendingDraw);
      this.addLog(`${q.name} берёт ${k} карт (восьмёрки)`);
      this.pendingDraw = 0;
    }
    if (this.pendingQueen) {
      const k = this.drawN(q, 5);
      this.addLog(`${q.name} берёт ${k} карт (дама пик)`);
      this.pendingQueen = false;
    }
    this.pendingSeven = false;
    this.pendingSkip = false;

    this.addLog(`${w.name} избавился от всех карт и выигрывает раунд ${this.round}!`);

    const results = [];
    for (const p of this.activePlayers()) {
      const pts = p.hand.reduce((s, c) => s + points(c), 0);
      p.score += pts;
      let note = '';
      if (p.score === 125) {
        p.score = 0;
        note = 'ровно 125 — обнуление!';
        this.addLog(`${p.name}: ровно 125 — обнуление!`);
      } else if (p.score > 125) {
        p.eliminated = true;
        note = 'больше 125 — выбывает';
        this.addLog(`${p.name} набирает ${p.score} и выбывает`);
      }
      results.push({ name: p.name, pts, score: p.score, note, winner: p === w });
    }
    this.roundResults = results;

    const act = this.activePlayers();
    if (act.length === 1) {
      this.phase = 'over';
      this.winner = act[0].name;
      this.addLog(`${act[0].name} — победитель партии!`);
    } else {
      this.phase = 'roundEnd';
    }
  }

  // ---------- состояние для клиента ----------

  setConnected(token, val) {
    const p = this.players.find(x => x.token === token);
    if (p) p.connected = val;
  }

  serialize(token) {
    const meIdx = this.players.findIndex(p => p.token === token);
    const me = meIdx >= 0 ? this.players[meIdx] : null;
    const myTurn = this.phase === 'playing' && this.turn === meIdx;

    const playable = (c) => {
      if (!myTurn) return false;
      if (this.pendingDraw > 0) return c.r === '8';
      if (this.drawnCardId && this.drawnCardId !== '__none__' && !this.mustCoverSix) {
        return c.id === this.drawnCardId && this.canPlayCard(c);
      }
      return this.canPlayCard(c);
    };

    return {
      type: 'game',
      phase: this.phase,
      round: this.round,
      youIdx: meIdx,
      turnIdx: this.phase === 'playing' ? this.turn : -1,
      dealerIdx: this.dealer,
      players: this.players.map((p, i) => ({
        name: p.name, count: p.hand.length, score: p.score,
        eliminated: p.eliminated, connected: p.connected, you: i === meIdx,
      })),
      hand: me ? me.hand.map(c => ({ id: c.id, r: c.r, s: c.s, playable: playable(c) })) : [],
      top: this.top(),
      jackSuit: this.jackSuit,
      pendingDraw: this.pendingDraw,
      kingStreak: this.kingStreak,
      deckCount: this.deck.length,
      mustCoverSix: myTurn && this.mustCoverSix,
      mustPlayEight: myTurn && this.pendingDraw > 0,
      drew: myTurn && !!this.drawnCardId,
      canDraw: myTurn && this.pendingDraw === 0 && (this.mustCoverSix || !this.drawnCardId),
      canPass: myTurn && !this.mustCoverSix && !!this.drawnCardId,
      log: this.log.slice(-60),
      roundResults: this.roundResults,
      winner: this.winner,
    };
  }
}

module.exports = { Game, SUITS, RANKS, RV, makeDeck };
