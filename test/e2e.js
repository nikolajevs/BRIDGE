'use strict';

// Сквозной тест: два клиента через WebSocket создают стол,
// начинают игру и доигрывают партию до конца случайными ходами.

const WebSocket = require('ws');

const URL = 'ws://localhost:' + (process.env.PORT || 3000);

function client(name) {
  const ws = new WebSocket(URL);
  const c = { name, ws, state: null, table: null, lobby: null, token: null, errors: [] };
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.type === 'hello') c.token = m.token;
    if (m.type === 'lobby') c.lobby = m;
    if (m.type === 'table') c.table = m;
    if (m.type === 'game') c.state = m;
    if (m.type === 'error') c.errors.push(m.msg);
  });
  c.send = (o) => ws.send(JSON.stringify(o));
  c.open = new Promise(res => ws.on('open', res));
  return c;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, what, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return;
    await sleep(25);
  }
  throw new Error('Не дождались: ' + what);
}

(async () => {
  const a = client('Игорь');
  const b = client('Анна');
  await a.open; await b.open;

  a.send({ type: 'hello', name: 'Игорь' });
  b.send({ type: 'hello', name: 'Анна' });
  await waitFor(() => a.lobby && b.lobby, 'лобби');

  a.send({ type: 'createTable', name: 'Тестовый' });
  await waitFor(() => a.table, 'создание стола');
  const code = a.table.id;
  console.log('Стол создан, код', code);

  b.send({ type: 'joinTable', id: code });
  await waitFor(() => a.table && a.table.players.length === 2, 'второй игрок');
  console.log('Второй игрок сел');

  a.send({ type: 'startGame' });
  await waitFor(() => a.state && b.state, 'начало игры');
  console.log('Игра началась, раунд', a.state.round, '— вслепую:', a.state.top.id);

  // случайная игра до конца партии
  let steps = 0;
  while (steps < 30000) {
    steps++;
    const st = a.state.phase === 'playing'
      ? (a.state.turnIdx === a.state.youIdx ? a : b)
      : null;

    if (a.state.phase === 'over') break;

    if (a.state.phase === 'roundEnd') {
      a.send({ type: 'nextRound' }); // хост
      const r = a.state.round;
      await waitFor(() => a.state.round === r + 1 || a.state.phase === 'over', 'новый раунд');
      continue;
    }

    const me = st.state;
    const play = me.hand.filter(c => c.playable);
    const before = JSON.stringify([me.turnIdx, me.hand.length, me.deckCount, me.top.id, me.drew, me.mustCoverSix, me.pendingDraw]);

    if (play.length && Math.random() < 0.9) {
      const c = play[Math.floor(Math.random() * play.length)];
      st.send({ type: 'playCard', cardId: c.id, suit: c.r === 'J' ? '♥' : undefined });
    } else if (me.canDraw) {
      st.send({ type: 'drawCard' });
    } else if (me.canPass) {
      st.send({ type: 'endTurn' });
    } else if (play.length) {
      const c = play[0];
      st.send({ type: 'playCard', cardId: c.id, suit: c.r === 'J' ? '♥' : undefined });
    } else {
      throw new Error('Тупик у ' + st.name);
    }

    await waitFor(() => {
      const now = JSON.stringify([st.state.turnIdx, st.state.hand.length, st.state.deckCount,
        st.state.top && st.state.top.id, st.state.drew, st.state.mustCoverSix, st.state.pendingDraw]);
      return now !== before || st.state.phase !== 'playing';
    }, 'реакция сервера на шаг ' + steps);
  }

  if (a.state.phase !== 'over') throw new Error('Партия не закончилась');
  console.log(`Партия окончена за ${steps} шагов. Победитель: ${a.state.winner}`);
  console.log('Последние записи журнала:');
  for (const l of a.state.log.slice(-6)) console.log('  ', l);

  const errs = [...a.errors, ...b.errors];
  console.log('Ошибок протокола (ожидаемо 0 критичных):', errs.length ? errs.slice(0, 5) : 'нет');

  // рестарт партии тем же столом
  a.send({ type: 'startGame' });
  await waitFor(() => a.state.phase === 'playing' && a.state.round === 1, 'рематч');
  console.log('Рематч работает.');

  a.ws.close(); b.ws.close();
  console.log('E2E: OK');
  process.exit(0);
})().catch(e => { console.error('E2E FAIL:', e.message); process.exit(1); });
