'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const { Game } = require('./game');

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
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
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
        connected: !!(byToken.get(x) && byToken.get(x).ws),
      })),
    });
  }
}

function broadcastGame(t) {
  if (!t.game) return;
  for (const tok of t.seats) {
    const rec = byToken.get(tok);
    if (!rec || !rec.ws) continue;
    const st = t.game.serialize(tok);
    st.tableId = t.id;
    st.tableName = t.name;
    st.youAreHost = t.host === tok;
    send(rec.ws, st);
  }
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

function removeSeat(t, token) {
  const i = t.seats.indexOf(token);
  if (i >= 0) t.seats.splice(i, 1);
  const rec = byToken.get(token);
  if (rec) rec.tableId = null;
  if (t.seats.length === 0) {
    tables.delete(t.id);
  } else if (t.host === token) {
    t.host = t.seats[0];
  }
}

// ---------- обработка сообщений ----------

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    try { handle(ws, m); } catch (e) {
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

function handle(ws, m) {
  if (m.type === 'hello') {
    const name = String(m.name || '').trim().slice(0, 20);
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
    send(ws, { type: 'hello', token, name });

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

    case 'startGame': {
      const t = tableOf(token);
      if (!t) throw new Error('Вы не за столом');
      if (t.host !== token) throw new Error('Начать игру может только создатель стола');
      if (t.game && t.game.phase !== 'over') throw new Error('Игра уже идёт');
      if (t.seats.length < 2) throw new Error('Нужно минимум 2 игрока');
      const seats = t.seats.map(x => ({ token: x, name: byToken.get(x).name }));
      t.game = new Game(seats);
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

// уборка брошенных столов (все офлайн дольше 15 минут)
setInterval(() => {
  const now = Date.now();
  for (const t of tables.values()) {
    const anyOnline = t.seats.some(tok => byToken.get(tok) && byToken.get(tok).ws);
    if (!anyOnline && now - t.lastActive > 15 * 60 * 1000) {
      for (const tok of t.seats) {
        const r = byToken.get(tok);
        if (r) r.tableId = null;
      }
      tables.delete(t.id);
    }
  }
}, 60 * 1000);

server.listen(PORT, () => {
  console.log(`«Бридж» запущена: http://localhost:${PORT}`);
});
