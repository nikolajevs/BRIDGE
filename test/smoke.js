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

ok('та же масть младше — нельзя', () => {
  const g = freshGame();
  force(g, { top: { r: '10', s: '♥' } });
  assert(!g.canPlayCard({ r: '7', s: '♥' }));
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

ok('9 кладётся на что угодно', () => {
  const g = freshGame();
  force(g, { top: { r: 'A', s: '♣' } });
  assert(g.canPlayCard({ r: '9', s: '♦' }));
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

ok('ровно 125 — обнуление', () => {
  const g = freshGame(2);
  force(g, { top: { r: '7', s: '♠' } });
  g.mustCoverSix = false;
  g.pendingSeven = g.pendingQueen = g.pendingSkip = false;
  const who = g.turn;
  const other = g.nextActiveIdx(who);
  g.players[who].hand = [{ r: '10', s: '♠', id: '10♠' }];
  // у соперника на руках 10+15=25, счёт 100 → станет ровно 125 → 0
  g.players[other].score = 100;
  g.players[other].hand = [{ r: '10', s: '♥', id: '10♥' }, { r: 'A', s: '♥', id: 'A♥' }];
  g.playCard(g.players[who].token, '10♠');
  assert.strictEqual(g.players[other].score, 0);
  assert(!g.players[other].eliminated);
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
