'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const { Game } = require('./game');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ---------- статика ----------

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(PUB, path.normalize(p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    // ETag по содержимому + no-cache: браузер обязан сверяться с сервером,
    // поэтому после деплоя всегда подтягивается свежая версия (при совпадении — 304).
    const etag = '"' + crypto.createHash('sha1').update(data).digest('hex').slice(0, 16) + '"';
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { 'ETag': etag, 'Cache-Control': 'no-cache' });
      return res.end();
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'ETag': etag,
    });
    res.end(data);
  });
});

// ---------- состояние ----------

const wss = new WebSocket.Server({ server });
const tables = new Map();   // id -> { id, name, host, seats: [token], game, lastActive }
const clients = new Map();  // ws -> token
const byToken = new Map();  // token -> { name, tableId, ws }

const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeCode() {
  let c;
  do {
    c = '';
    for (let i = 0; i < 4; i++) c += CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)];
  } while (tables.has(c));
  return c;
}

function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function lobbyPayload() {
  return {
    type: 'lobby',
    tables: [...tables.values()]
      .filter(t => !t.game && t.seats.length < 6)
      .map(t => ({ id: t.id, name: t.name, players: t.seats.length })),
  };
}

function broadcastLobby() {
  for (const [ws, token] of clients) {
    const rec = byToken.get(token);
    if (!rec || !rec.tableId) send(ws, lobbyPayload());
  }
}

function broadcastTable(t) {
  for (const tok of t.seats) {
    const rec = byToken.get(tok);
    if (!rec || !rec.ws) continue;
    send(rec.ws, {
      type: 'table',
      id: t.id,
      name: t.name,
      youAreHost: t.host === tok,
      inGame: !!t.game && t.game.phase !== 'over',
      players: t.seats.map(x => ({
        name: byToken.get(x) ? byToken.get(x).name : '?',
        host: x === t.host,
        you: x === tok,
        isBot: !!(byToken.get(x) && byToken.get(x).isBot),
        connected: !!(byToken.get(x) && (byToken.get(x).ws || byToken.get(x).isBot)),
      })),
    });
  }
}

const TURN_MS = 30000; // лимит времени на ход

// (пере)запускает 30-секундный таймер, когда ход переходит новому игроку.
// Пока ходит тот же игрок (добор, накрытие шестёрки) — таймер не сбрасывается.
function syncTurnTimer(t) {
  if (!t.game || t.game.phase !== 'playing') {
    if (t.turnTimer) { clearTimeout(t.turnTimer); t.turnTimer = null; }
    t.turnOwner = null;
    t.turnDeadline = null;
    return;
  }
  const token = t.game.players[t.game.turn].token;
  if (t.turnOwner === token && t.turnTimer) return; // тот же ход — таймер уже идёт
  t.turnOwner = token;
  t.turnDeadline = Date.now() + TURN_MS;
  if (t.turnTimer) clearTimeout(t.turnTimer);
  t.turnTimer = setTimeout(() => onTurnTimeout(t, token), TURN_MS);
}

function onTurnTimeout(t, token) {
  if (!t.game || t.game.phase !== 'playing') return;
  if (t.game.players[t.game.turn].token !== token) return; // ход уже ушёл
  try { t.game.autoMove(t.game.turn); } catch (e) { /* игнорируем */ }
  t.lastActive = Date.now();
  broadcastGame(t);
  if (t.game.phase === 'over') broadcastTable(t);
}

function recordGameResult(t) {
  if (!t.game || t.game.phase !== 'over' || t.recorded) return;
  t.recorded = true;
  const g = t.game;
  const participantIds = [];
  const roundsWonById = {};
  let winnerId = null;
  const seen = new Set();
  for (const tok of t.seats) {
    const rec = byToken.get(tok);
    if (!rec || !rec.userId || seen.has(rec.userId)) continue;
    seen.add(rec.userId);
    participantIds.push(rec.userId);
    const rw = g.roundsWonByToken[tok] || 0;
    if (rw) roundsWonById[rec.userId] = rw;
    if (tok === g.winnerToken) winnerId = rec.userId;
  }
  if (participantIds.length) {
    try { db.recordGame(participantIds, winnerId, roundsWonById); } catch (e) { /* не роняем игру */ }
  }
}

function broadcastGame(t) {
  if (!t.game) return;
  syncTurnTimer(t);
  recordGameResult(t);
  // фиксируем момент появления таблицы результатов (для защиты от слишком быстрого пропуска)
  const ph = t.game.phase;
  if ((ph === 'roundEnd' || ph === 'over') && t.resultsPhase !== ph) t.resultsAt = Date.now();
  t.resultsPhase = (ph === 'roundEnd' || ph === 'over') ? ph : null;
  const msLeft = t.turnDeadline ? Math.max(0, t.turnDeadline - Date.now()) : null;
  for (const tok of t.seats) {
    const rec = byToken.get(tok);
    if (!rec || !rec.ws) continue;
    const st = t.game.serialize(tok);
    st.tableId = t.id;
    st.tableName = t.name;
    st.youAreHost = t.host === tok;
    st.turnMsLeft = msLeft;
    st.turnLimitMs = TURN_MS;
    send(rec.ws, st);
  }
  scheduleBot(t);
}

// Если ход за ботом — через небольшую задержку делаем один его шаг и снова
// рассылаем состояние (что запускает следующий шаг). Так бот «думает» по ходу.
function scheduleBot(t) {
  if (!t.game || t.game.phase !== 'playing') {
    if (t.botTimer) { clearTimeout(t.botTimer); t.botTimer = null; }
    return;
  }
  const cur = t.game.players[t.game.turn].token;
  const rec = byToken.get(cur);
  const isBot = rec && rec.isBot;
  if (!isBot) return;
  if (t.botTimer) return; // шаг уже запланирован
  t.botTimer = setTimeout(() => {
    t.botTimer = null;
    if (!t.game || t.game.phase !== 'playing') return;
    const idx = t.game.turn;
    if (!(byToken.get(t.game.players[idx].token) || {}).isBot) return;
    try { t.game.botStep(idx); } catch (e) { console.error('[bot]', e.message); }
    t.lastActive = Date.now();
    broadcastGame(t);
    if (t.game.phase === 'over') broadcastTable(t);
  }, 900);
}

function broadcastChat(t, from, text) {
  for (const tok of t.seats) {
    const rec = byToken.get(tok);
    if (rec && rec.ws) send(rec.ws, { type: 'chat', from, text });
  }
}

function tableOf(token) {
  const rec = byToken.get(token);
  if (!rec || !rec.tableId) return null;
  return tables.get(rec.tableId) || null;
}

function deleteTableBots(t) {
  for (const x of t.seats) {
    const r = byToken.get(x);
    if (r && r.isBot) byToken.delete(x);
  }
}

function removeSeat(t, token) {
  const i = t.seats.indexOf(token);
  if (i >= 0) t.seats.splice(i, 1);
  const rec = byToken.get(token);
  if (rec) rec.tableId = null;

  // остались только боты (или никого) — стол больше не нужен
  const humans = t.seats.filter(x => !((byToken.get(x) || {}).isBot));
  if (humans.length === 0) {
    if (t.turnTimer) { clearTimeout(t.turnTimer); t.turnTimer = null; }
    if (t.botTimer) { clearTimeout(t.botTimer); t.botTimer = null; }
    deleteTableBots(t);
    tables.delete(t.id);
    return;
  }
  if (t.host === token) t.host = humans[0]; // хост всегда человек
}

// ---------- обработка сообщений ----------

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    try { handle(ws, m); } catch (e) {
      console.error(`[handle:${m && m.type}]`, e && e.stack ? e.stack : e);
      send(ws, { type: 'error', msg: e.message || 'Ошибка' });
    }
  });

  ws.on('close', () => {
    const token = clients.get(ws);
    clients.delete(ws);
    if (!token) return;
    const rec = byToken.get(token);
    if (!rec || rec.ws !== ws) return; // уже переподключился с другого сокета
    rec.ws = null;
    const t = tableOf(token);
    if (!t) return;
    t.lastActive = Date.now();
    if (t.game && t.game.phase !== 'over') {
      t.game.setConnected(token, false);
      broadcastGame(t);
    } else {
      // до игры (или после её конца) освобождаем место
      removeSeat(t, token);
      if (tables.has(t.id)) broadcastTable(t);
      broadcastLobby();
    }
  });
});

function sendAuth(ws, user) {
  const authToken = db.createSession(user.id);
  send(ws, {
    type: 'auth',
    authToken,
    login: user.login,
    name: user.name,
    isAdmin: db.isAdmin(user),
    stats: db.userStats(user.id),
  });
}

// проверить, что сессия принадлежит администратору
function requireAdmin(auth) {
  const user = db.userBySession(auth);
  if (!user || !db.isAdmin(user)) throw new Error('Требуются права администратора');
  return user;
}

function handle(ws, m) {
  // --- аккаунты (можно вызывать до hello) ---
  if (m.type === 'register') {
    const user = db.register(m.login, m.password, m.name);
    sendAuth(ws, user);
    return;
  }
  if (m.type === 'login') {
    const user = db.login(m.login, m.password);
    sendAuth(ws, user);
    return;
  }
  if (m.type === 'logout') {
    db.deleteSession(m.auth);
    const tok = clients.get(ws);
    if (tok) { const r = byToken.get(tok); if (r) r.userId = null; }
    send(ws, { type: 'loggedOut' });
    return;
  }
  if (m.type === 'getLeaderboard') {
    send(ws, { type: 'leaderboard', rows: db.leaderboard(100) });
    return;
  }
  if (m.type === 'getProfile') {
    const user = db.userBySession(m.auth);
    if (!user) throw new Error('Нужно войти в аккаунт');
    send(ws, { type: 'profile', stats: db.userStats(user.id) });
    return;
  }
  if (m.type === 'adminListUsers') {
    requireAdmin(m.auth);
    send(ws, { type: 'adminUsers', users: db.listUsers() });
    return;
  }
  if (m.type === 'adminUpdateUser') {
    requireAdmin(m.auth);
    db.updateUser(m.id, {
      name: m.name, login: m.login,
      password: m.password || undefined,
      isAdmin: m.isAdmin,
    });
    send(ws, { type: 'adminUsers', users: db.listUsers(), notice: 'Изменения сохранены' });
    return;
  }
  if (m.type === 'adminDeleteUser') {
    const admin = requireAdmin(m.auth);
    if (admin.id === m.id) throw new Error('Нельзя удалить собственный аккаунт');
    db.deleteUser(m.id);
    send(ws, { type: 'adminUsers', users: db.listUsers(), notice: 'Аккаунт удалён' });
    return;
  }

  if (m.type === 'hello') {
    // аккаунт (если пришёл валидный auth-токен) переопределяет имя
    const account = m.auth ? db.userBySession(m.auth) : null;
    const name = account ? account.name : String(m.name || '').trim().slice(0, 20);
    if (!name) throw new Error('Введите имя');
    let token = typeof m.token === 'string' && m.token.length >= 16 ? m.token : null;
    if (!token) token = crypto.randomUUID();
    clients.set(ws, token);

    let rec = byToken.get(token);
    if (!rec) { rec = { name, tableId: null, ws }; byToken.set(token, rec); }
    else {
      if (rec.ws && rec.ws !== ws) { try { rec.ws.close(); } catch {} }
      rec.ws = ws;
      rec.name = name;
    }
    rec.userId = account ? account.id : null;
    send(ws, { type: 'hello', token, name, account: account ? { login: account.login, name: account.name, isAdmin: db.isAdmin(account) } : null });

    const t = tableOf(token);
    if (t) {
      t.lastActive = Date.now();
      if (t.game && t.game.phase !== 'over') {
        t.game.setConnected(token, true);
        broadcastTable(t);
        broadcastGame(t);
      } else {
        broadcastTable(t);
      }
    } else {
      send(ws, lobbyPayload());
    }
    return;
  }

  const token = clients.get(ws);
  if (!token) throw new Error('Сначала представьтесь');
  const rec = byToken.get(token);

  switch (m.type) {
    case 'createTable': {
      if (tableOf(token)) throw new Error('Вы уже за столом');
      const id = makeCode();
      const t = {
        id,
        name: String(m.name || '').trim().slice(0, 24) || `Стол ${id}`,
        host: token,
        seats: [token],
        game: null,
        createdAt: Date.now(),
        lastActive: Date.now(),
      };
      tables.set(id, t);
      rec.tableId = id;
      broadcastTable(t);
      broadcastLobby();
      break;
    }

    case 'joinTable': {
      if (tableOf(token)) throw new Error('Вы уже за столом');
      const t = tables.get(String(m.id || '').toUpperCase());
      if (!t) throw new Error('Стол не найден');
      if (t.game && t.game.phase !== 'over') throw new Error('За этим столом уже идёт игра');
      if (t.seats.length >= 6) throw new Error('Стол заполнен (максимум 6)');
      t.seats.push(token);
      rec.tableId = t.id;
      t.lastActive = Date.now();
      broadcastTable(t);
      broadcastLobby();
      break;
    }

    case 'leaveTable': {
      const t = tableOf(token);
      if (!t) break;
      if (t.game && t.game.phase !== 'over') {
        try { t.game.resign(token); } catch {}
        broadcastGame(t);
      }
      removeSeat(t, token);
      if (tables.has(t.id)) { broadcastTable(t); if (t.game) broadcastGame(t); }
      send(ws, lobbyPayload());
      broadcastLobby();
      break;
    }

    case 'addBot': {
      const t = tableOf(token);
      if (!t) throw new Error('Вы не за столом');
      if (t.host !== token) throw new Error('Добавить бота может только создатель стола');
      if (t.game && t.game.phase !== 'over') throw new Error('Идёт игра');
      if (t.seats.length >= 6) throw new Error('Стол заполнен (максимум 6)');
      const botToken = 'bot:' + crypto.randomUUID();
      const n = t.seats.filter(x => (byToken.get(x) || {}).isBot).length + 1;
      byToken.set(botToken, { name: 'Бот ' + n, ws: null, isBot: true, tableId: t.id });
      t.seats.push(botToken);
      t.lastActive = Date.now();
      broadcastTable(t);
      broadcastLobby();
      break;
    }

    case 'removeBot': {
      const t = tableOf(token);
      if (!t) throw new Error('Вы не за столом');
      if (t.host !== token) throw new Error('Только создатель стола');
      if (t.game && t.game.phase !== 'over') throw new Error('Идёт игра');
      // убираем последнего бота
      for (let k = t.seats.length - 1; k >= 0; k--) {
        if ((byToken.get(t.seats[k]) || {}).isBot) {
          byToken.delete(t.seats[k]);
          t.seats.splice(k, 1);
          break;
        }
      }
      broadcastTable(t);
      broadcastLobby();
      break;
    }

    case 'startGame': {
      const t = tableOf(token);
      if (!t) throw new Error('Вы не за столом');
      if (t.host !== token) throw new Error('Начать игру может только создатель стола');
      if (t.game && t.game.phase !== 'over') throw new Error('Игра уже идёт');
      if (t.seats.length < 2) throw new Error('Нужно минимум 2 игрока');
      if (t.game && t.game.phase === 'over' && t.resultsAt && Date.now() - t.resultsAt < 6500) {
        throw new Error('Дайте всем прочитать итоги партии');
      }
      const seats = t.seats.map(x => ({ token: x, name: byToken.get(x).name, isBot: !!byToken.get(x).isBot }));
      t.game = new Game(seats);
      t.recorded = false;
      t.lastActive = Date.now();
      broadcastGame(t);
      broadcastLobby();
      break;
    }

    case 'playCard': {
      const t = tableOf(token);
      if (!t || !t.game) throw new Error('Игра не идёт');
      t.game.playCard(token, String(m.cardId || ''), m.suit);
      t.lastActive = Date.now();
      broadcastGame(t);
      if (t.game.phase === 'over') broadcastTable(t);
      break;
    }

    case 'dumpJacks': {
      const t = tableOf(token);
      if (!t || !t.game) throw new Error('Игра не идёт');
      t.game.dumpJacks(token, m.suit);
      t.lastActive = Date.now();
      broadcastGame(t);
      if (t.game.phase === 'over') broadcastTable(t);
      break;
    }

    case 'drawCard': {
      const t = tableOf(token);
      if (!t || !t.game) throw new Error('Игра не идёт');
      t.game.drawCard(token);
      t.lastActive = Date.now();
      broadcastGame(t);
      break;
    }

    case 'endTurn': {
      const t = tableOf(token);
      if (!t || !t.game) throw new Error('Игра не идёт');
      t.game.endTurn(token);
      t.lastActive = Date.now();
      broadcastGame(t);
      break;
    }

    case 'nextRound': {
      const t = tableOf(token);
      if (!t || !t.game) throw new Error('Игра не идёт');
      if (t.host !== token) throw new Error('Следующий раунд запускает создатель стола');
      if (t.resultsAt && Date.now() - t.resultsAt < 6500) {
        throw new Error('Дайте всем прочитать итоги раунда');
      }
      t.game.nextRound();
      t.lastActive = Date.now();
      broadcastGame(t);
      break;
    }

    case 'chat': {
      const t = tableOf(token);
      if (!t) break;
      const text = String(m.text || '').trim().slice(0, 200);
      if (text) broadcastChat(t, rec.name, text);
      break;
    }

    default:
      break;
  }
}

const EMPTY_TABLE_MS = Number(process.env.EMPTY_TABLE_MS) || 5 * 60 * 1000;    // стол, к которому никто не подсел
const ABANDONED_TABLE_MS = Number(process.env.ABANDONED_TABLE_MS) || 15 * 60 * 1000; // все офлайн — стол убирается
const CLEANUP_MS = Number(process.env.CLEANUP_MS) || 30 * 1000;                 // как часто проверяем

// Закрыть стол: погасить таймеры, освободить игроков, удалить ботов и сам стол.
// Оставшимся за столом людям шлём причину и возвращаем их в лобби.
function closeTable(t, notice) {
  if (t.turnTimer) { clearTimeout(t.turnTimer); t.turnTimer = null; }
  if (t.botTimer) { clearTimeout(t.botTimer); t.botTimer = null; }
  const sockets = [];
  for (const tok of t.seats) {
    const r = byToken.get(tok);
    if (!r) continue;
    r.tableId = null;
    if (r.ws) sockets.push(r.ws);
  }
  deleteTableBots(t);
  tables.delete(t.id);
  if (notice) for (const ws of sockets) send(ws, { type: 'error', msg: notice });
  broadcastLobby(); // вернёт освобождённых игроков в лобби и обновит список у всех
}

// уборка столов
setInterval(() => {
  const now = Date.now();
  for (const t of tables.values()) {
    const anyOnline = t.seats.some(tok => byToken.get(tok) && byToken.get(tok).ws);

    // брошенный стол: все офлайн дольше 15 минут
    if (!anyOnline && now - t.lastActive > ABANDONED_TABLE_MS) {
      closeTable(t);
      continue;
    }

    // игра так и не началась и никто не подсел за 5 минут
    const humans = t.seats.filter(tok => !((byToken.get(tok) || {}).isBot)).length;
    if (!t.game && humans <= 1 && now - (t.createdAt || t.lastActive) > EMPTY_TABLE_MS) {
      closeTable(t, 'Стол закрыт: за 5 минут никто не присоединился');
    }
  }
}, CLEANUP_MS);

server.listen(PORT, () => {
  console.log(`«Бридж» запущена: http://localhost:${PORT}`);
});
