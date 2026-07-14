'use strict';

// Проверка игровой логики: точечные тесты правил + 300 случайных партий
// с инвариантом «все 36 карт всегда на месте».

const assert = require('assert');
const { Game } = require('../server/game');

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1; }
}

function freshGame(n = 2) {
  const seats = [];
  for (let i = 0; i < n; i++) seats.push({ token: 't' + i, name: 'P' + i });
  return new Game(seats);
}

// принудительно выставить состояние (для точечных тестов)
function force(g, { top, jackSuit = null, pendingDraw = 0 }) {
  g.discard = [Object.assign({ id: top.r + top.s }, top)];
  g.jackSuit = jackSuit;
  g.pendingDraw = pendingDraw;
}

console.log('Точечные проверки правил:');

ok('та же масть старше — можно', () => {
  const g = freshGame();
  force(g, { top: { r: '7', s: '♥' } });
  assert(g.canPlayCard({ r: '10', s: '♥' }));
});

ok('та же масть младше — тоже можно (классика)', () => {
  const g = freshGame();
  force(g, { top: { r: '10', s: '♥' } });
  assert(g.canPlayCard({ r: '7', s: '♥' }));
});

ok('на туза можно класть младшую той же масти (6 или король)', () => {
  const g = freshGame();
  force(g, { top: { r: 'A', s: '♠' } });
  assert(g.canPlayCard({ r: '6', s: '♠' }));    // шестёрку той же масти — можно
  assert(g.canPlayCard({ r: 'K', s: '♠' }));    // короля той же масти — можно
  assert(g.canPlayCard({ r: 'A', s: '♥' }));    // другого туза (то же достоинство) — можно
  assert(!g.canPlayCard({ r: '6', s: '♥' }));   // 6 другой масти — нельзя
});

ok('то же достоинство другой масти — можно', () => {
  const g = freshGame();
  force(g, { top: { r: '10', s: '♣' } });
  assert(g.canPlayCard({ r: '10', s: '♥' }));
});

ok('другая масть и достоинство — нельзя', () => {
  const g = freshGame();
  force(g, { top: { r: '10', s: '♣' } });
  assert(!g.canPlayCard({ r: 'K', s: '♥' }));
});

ok('9 универсальная — кладётся на любую карту', () => {
  const g = freshGame();
  force(g, { top: { r: 'A', s: '♣' } });
  assert(g.canPlayCard({ r: '9', s: '♦' }));            // 9 другой масти на туза — можно
});

ok('на 9 можно ответить девяткой (9 на 9)', () => {
  const g = freshGame();
  force(g, { top: { r: '9', s: '♣' } });
  assert(g.canPlayCard({ r: '9', s: '♥' }));            // 9 на 9 другой масти
  assert(g.canPlayCard({ r: 'K', s: '♣' }));            // та же масть
  assert(g.canPlayCard({ r: '6', s: '♣' }));            // та же масть, младше — тоже можно
});

ok('за один ход кладётся только одна девятка', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const p = g.players[who];
  p.hand = [{ r: '9', s: '♦', id: '9♦' }, { r: '9', s: '♥', id: '9♥' }];
  g.playCard(p.token, '9♦');                            // положили одну девятку
  assert.notStrictEqual(g.turn, who, 'ход должен уйти сопернику — вторую 9 не кинуть');
});

ok('валет кладётся на что угодно', () => {
  const g = freshGame();
  force(g, { top: { r: 'A', s: '♣' } });
  assert(g.canPlayCard({ r: 'J', s: '♦' }));
});

ok('в цепочке восьмёрок 9 и валет запрещены, восьмёрка — можно', () => {
  const g = freshGame();
  force(g, { top: { r: '8', s: '♣' }, pendingDraw: 2 });
  assert(!g.canPlayCard({ r: '9', s: '♣' }));
  assert(!g.canPlayCard({ r: 'J', s: '♣' }));
  assert(g.canPlayCard({ r: '8', s: '♦' }));
});

ok('после валета подходит любая карта заказанной масти', () => {
  const g = freshGame();
  force(g, { top: { r: 'J', s: '♣' }, jackSuit: '♥' });
  assert(g.canPlayCard({ r: '6', s: '♥' }));
  assert(!g.canPlayCard({ r: 'A', s: '♦' }));
});

ok('шестёрку нельзя оставить: ход остаётся у игрока', () => {
  const g = freshGame(3);
  // подстроим: у текущего игрока 6♥ и 10♥, наверху 6♣
  force(g, { top: { r: '6', s: '♣' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const p = g.players[g.turn];
  p.hand = [{ r: '6', s: '♥', id: '6♥' }, { r: '10', s: '♥', id: '10♥' }, { r: 'A', s: '♠', id: 'A♠' }];
  const who = g.turn;
  g.playCard(p.token, '6♥'); // 6 на 6 — смена масти, но ход не закончен
  assert.strictEqual(g.turn, who, 'ход должен остаться у того же игрока');
  assert(g.mustCoverSix);
  g.playCard(p.token, '10♥'); // накрыл — ход уходит
  assert(!g.mustCoverSix);
  assert.notStrictEqual(g.turn, who);
});

ok('туз: соперник пропускает, ход возвращается (2 игрока)', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const p = g.players[who];
  p.hand = [{ r: 'A', s: '♠', id: 'A♠' }, { r: '7', s: '♦', id: '7♦' }];
  g.playCard(p.token, 'A♠');
  assert.strictEqual(g.turn, who, 'после туза в игре 1×1 ход возвращается');
});

ok('цепочка восьмёрок: без восьмёрки берёшь штраф и пропускаешь', () => {
  const g = freshGame(2);
  force(g, { top: { r: '8', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  const p = g.players[who];
  p.hand = [{ r: '8', s: '♦', id: '8♦' }, { r: '7', s: '♦', id: '7♦' }];
  g.players[other].hand = [{ r: '10', s: '♥', id: '10♥' }]; // восьмёрки нет
  const before = g.players[other].hand.length;
  g.playCard(p.token, '8♦');
  // соперник автоматически взял 2 и пропустил — ход снова у первого
  assert.strictEqual(g.turn, who);
  assert.strictEqual(g.players[other].hand.length, before + 2);
  assert.strictEqual(g.pendingDraw, 0);
});

ok('4 короля подряд — мгновенная победа', () => {
  const g = freshGame(2);
  force(g, { top: { r: 'K', s: '♠' } });
  g.kingStreak = 3;
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const p = g.players[g.turn];
  p.hand = [{ r: 'K', s: '♦', id: 'K♦' }, { r: '7', s: '♦', id: '7♦' }];
  g.playCard(p.token, 'K♦');
  assert.strictEqual(g.phase, 'over');
  assert.strictEqual(g.winner, p.name);
});

ok('очки: 6/7/8/9 — 0, туз — 15, прочие — 10', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: '10', s: '♠', id: '10♠' }];
  g.players[other].hand = [
    { r: '6', s: '♥', id: '6♥' }, { r: '7', s: '♥', id: '7♥' },
    { r: '8', s: '♥', id: '8♥' }, { r: '9', s: '♥', id: '9♥' }, // по 0
    { r: 'K', s: '♣', id: 'K♣' },                               // 10
    { r: 'A', s: '♦', id: 'A♦' }, { r: 'A', s: '♥', id: 'A♥' }, // 15+15
  ];
  g.playCard(g.players[who].token, '10♠');
  assert.strictEqual(g.players[other].score, 40, '0+0+0+0+10+15+15 = 40 (≥30, открывает счёт)');
});

ok('ровно 125 — обнуление', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: '10', s: '♠', id: '10♠' }];
  // счёт уже открыт (100), на руках 10+15=25 → станет ровно 125 → 0
  g.players[other].score = 100;
  g.players[other].hand = [{ r: '10', s: '♥', id: '10♥' }, { r: 'A', s: '♥', id: 'A♥' }];
  g.playCard(g.players[who].token, '10♠');
  assert.strictEqual(g.players[other].score, 0);
  assert(!g.players[other].eliminated);
});

ok('порог 30: раунд <30 не открывает счёт', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: '10', s: '♠', id: '10♠' }];
  g.players[other].hand = [{ r: '10', s: '♥', id: '10♥' }, { r: 'K', s: '♥', id: 'K♥' }]; // 20 < 30
  g.playCard(g.players[who].token, '10♠');
  assert.strictEqual(g.players[other].score, 0, 'меньше 30 — счёт не открыт');
});

ok('порог 30: раунд 30+ открывает счёт', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: '10', s: '♠', id: '10♠' }];
  g.players[other].hand = [{ r: 'A', s: '♥', id: 'A♥' }, { r: 'A', s: '♦', id: 'A♦' }]; // 30
  g.playCard(g.players[who].token, '10♠');
  assert.strictEqual(g.players[other].score, 30, '30 — счёт открыт');
});

ok('порог 30: после открытия считаются и раунды <30', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: '10', s: '♠', id: '10♠' }];
  g.players[other].score = 40; // счёт уже открыт
  g.players[other].hand = [{ r: '10', s: '♥', id: '10♥' }]; // 10 < 30, но открыт
  g.playCard(g.players[who].token, '10♠');
  assert.strictEqual(g.players[other].score, 50, 'открытый счёт: +10');
});

ok('финиш одним валетом — очки проигравших ×2', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });     // сверху не валет
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: 'J', s: '♥', id: 'J♥' }];   // победная карта — валет
  g.players[other].hand = [{ r: '10', s: '♣', id: '10♣' }, { r: 'A', s: '♣', id: 'A♣' }]; // 10+15=25
  g.playCard(g.players[who].token, 'J♥', '♣');
  assert.strictEqual(g.players[other].score, 50, 'должно быть 25×2');
});

ok('чужой валет снизу не считается — только свой ×2', () => {
  const g = freshGame(2);
  force(g, { top: { r: 'J', s: '♣' } });     // валет соперника уже лежит
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: 'J', s: '♥', id: 'J♥' }];   // свой один валет
  g.players[other].score = 50;                            // счёт уже открыт
  g.players[other].hand = [{ r: '10', s: '♠', id: '10♠' }]; // 10
  g.playCard(g.players[who].token, 'J♥', '♠');
  assert.strictEqual(g.players[other].score, 70, '50 + 10×2 = 70 (чужой валет не суммируется; ×3 дало бы 80)');
});

ok('дамп двух валетов последними картами — ×3', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: 'J', s: '♥', id: 'J♥' }, { r: 'J', s: '♠', id: 'J♠' }];
  g.players[other].hand = [{ r: '10', s: '♣', id: '10♣' }]; // 10
  g.dumpJacks(g.players[who].token, '♣');
  assert.notStrictEqual(g.phase, 'playing', 'раунд должен завершиться');
  assert.strictEqual(g.players[other].score, 30, 'должно быть 10×3');
});

ok('дамп валетов запрещён, если есть не-валет', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  g.players[who].hand = [{ r: 'J', s: '♥', id: 'J♥' }, { r: '7', s: '♦', id: '7♦' }];
  let threw = false;
  try { g.dumpJacks(g.players[who].token, '♠'); } catch { threw = true; }
  assert(threw, 'дамп должен быть запрещён при наличии не-валета');
});

ok('финиш не валетом — множителя нет', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: '10', s: '♠', id: '10♠' }];
  g.players[other].hand = [{ r: 'A', s: '♥', id: 'A♥' }, { r: 'A', s: '♦', id: 'A♦' }, { r: 'K', s: '♣', id: 'K♣' }]; // 40
  g.playCard(g.players[who].token, '10♠');
  assert.strictEqual(g.players[other].score, 40, 'без множителя — 40 (15+15+10)');
});

ok('автоход: берёт карту и пасует, не играя из руки', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: '10', s: '♠', id: '10♠' }]; // играбельна, но играть не должны
  g.autoMove(who);
  assert(g.turn === other || g.phase !== 'playing', 'ход должен уйти дальше');
  assert(g.players[who].hand.some(c => c.id === '10♠'), 'карта не должна быть сыграна');
});

ok('автоход в цепочке восьмёрок: берёт штраф и пропускает', () => {
  const g = freshGame(2);
  force(g, { top: { r: '8', s: '♠' }, pendingDraw: 2 });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const before = g.players[who].hand.length;
  g.players[who].hand.push({ r: '8', s: '♦', id: '8♦' }); // есть восьмёрка, но время вышло
  g.autoMove(who);
  assert.strictEqual(g.pendingDraw, 0, 'штраф погашен');
  assert.strictEqual(g.players[who].hand.length, before + 1 + 2, 'взял 2 штрафные');
  assert(g.turn !== who || g.phase !== 'playing', 'ход пропущен');
});

ok('автоход: накрывает шестёрку', () => {
  const g = freshGame(2);
  force(g, { top: { r: '6', s: '♣' } });
  g.mustCoverSix = true;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  g.players[who].hand = [{ r: '10', s: '♣', id: '10♣' }, { r: 'A', s: '♠', id: 'A♠' }];
  g.autoMove(who);
  assert(!g.mustCoverSix, 'шестёрка должна быть накрыта');
  assert(g.turn !== who || g.phase !== 'playing');
});

// ---------- случайные партии ----------

console.log('\nСлучайные партии (инварианты):');

function totalCards(g) {
  return g.deck.length + g.discard.length +
    g.players.reduce((s, p) => s + p.hand.length, 0);
}

function randomPlayout(numPlayers, maxSteps = 50000) {
  const g = freshGame(numPlayers);
  let steps = 0;
  while (g.phase !== 'over' && steps < maxSteps) {
    steps++;
    if (g.phase === 'roundEnd') { g.nextRound(); continue; }
    const p = g.players[g.turn];
    const st = g.serialize(p.token);
    const play = st.hand.filter(c => c.playable);
    if (play.length && Math.random() < 0.9) {
      const c = play[Math.floor(Math.random() * play.length)];
      const suit = c.r === 'J' ? '♠♣♥♦'[Math.floor(Math.random() * 4)] : undefined;
      g.playCard(p.token, c.id, suit);
    } else if (st.canDraw) {
      g.drawCard(p.token);
    } else if (st.canPass) {
      g.endTurn(p.token);
    } else if (play.length) {
      const c = play[0];
      g.playCard(p.token, c.id, c.r === 'J' ? '♠' : undefined);
    } else {
      throw new Error('Тупик: нет ни одного действия');
    }
    if (g.phase === 'playing') {
      const t = totalCards(g);
      // выбывшие уносят карты с руками только между раундами; в течение
      // раунда все 36 карт должны быть на столе/в руках/в прикупе,
      // за вычетом рук выбывших (resign в случайной игре не используется)
      assert.strictEqual(t, 36, 'потеряны карты: ' + t);
      assert(!g.players[g.turn].eliminated, 'ход у выбывшего');
    }
  }
  assert(g.phase === 'over', 'партия не закончилась за ' + maxSteps + ' шагов');
  return steps;
}

for (const n of [2, 3, 4, 6]) {
  ok(`100 случайных партий, ${n} игрока(ов)`, () => {
    for (let i = 0; i < 100; i++) randomPlayout(n);
  });
}

console.log(passed + ' проверок пройдено' + (process.exitCode ? ', есть ошибки!' : '.'));
