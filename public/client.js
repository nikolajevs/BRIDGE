'use strict';

/* Клиент игры «Бридж» */

const BUILD = 'accounts-2026-07-13';
console.log('Бридж client build:', BUILD);

const $ = (s) => document.querySelector(s);

const store = {
  get token() { return localStorage.getItem('g125_token') || ''; },
  set token(v) { localStorage.setItem('g125_token', v); },
  get name() { return localStorage.getItem('g125_name') || ''; },
  set name(v) { localStorage.setItem('g125_name', v); },
  get auth() { return localStorage.getItem('g125_auth') || ''; },
  set auth(v) { if (v) localStorage.setItem('g125_auth', v); else localStorage.removeItem('g125_auth'); },
};

let account = null;      // { login, name } когда вошли в аккаунт
let pendingOpen = null;  // отложенное действие после открытия сокета

let ws = null;
let wsReady = false;
let reconnectTimer = null;
let currentScreen = 'name';
let lastGame = null;
let chatLines = [];

// ---------- сеть ----------

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => {
    wsReady = true;
    $('#conn').classList.add('hidden');
    if (pendingOpen) { const fn = pendingOpen; pendingOpen = null; fn(); return; }
    if (store.auth) sendMsg({ type: 'hello', auth: store.auth, token: store.token });
    else if (store.name) sendMsg({ type: 'hello', name: store.name, token: store.token });
  };

  ws.onmessage = (ev) => {
    let m;
    try { m = JSON.parse(ev.data); } catch { return; }
    dispatch(m);
  };

  ws.onclose = () => {
    wsReady = false;
    $('#conn').classList.remove('hidden');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 1500);
  };
}

function sendMsg(obj) {
  if (wsReady) ws.send(JSON.stringify(obj));
}

// ---------- маршрутизация сообщений ----------

function dispatch(m) {
  switch (m.type) {
    case 'hello':
      store.token = m.token;
      store.name = m.name;
      account = m.account || null;
      break;
    case 'auth':
      store.auth = m.authToken;
      account = { login: m.login, name: m.name };
      lastProfile = m.stats || null;
      authError('');
      // входим в игру под аккаунтом
      sendMsg({ type: 'hello', auth: store.auth, token: store.token });
      break;
    case 'loggedOut':
      account = null;
      store.auth = '';
      show('name');
      break;
    case 'profile':
      lastProfile = m.stats;
      renderCabinet();
      break;
    case 'leaderboard':
      lastLeaderboard = m.rows;
      renderLeaderboard();
      break;
    case 'lobby':
      renderLobby(m);
      show('lobby');
      break;
    case 'table':
      renderTable(m);
      if (!m.inGame) { chatLines = []; show('table'); }
      break;
    case 'game':
      lastGame = m;
      updateTurnDeadline(m);
      maybePlayTurnSound(m);
      renderGame(m);
      show('game');
      break;
    case 'chat':
      chatLines.push({ from: m.from, text: m.text });
      if (chatLines.length > 100) chatLines.shift();
      if (lastGame) renderLog(lastGame);
      break;
    case 'error':
      // ошибки входа/регистрации показываем на экране входа, прочее — тостом
      if (currentScreen === 'name') authError(m.msg);
      else toast(m.msg);
      break;
  }
}

let lastProfile = null;
let lastLeaderboard = null;

function authError(msg) {
  const el = $('#auth-error');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

// ---------- утилиты UI ----------

function show(name) {
  currentScreen = name;
  for (const s of ['name', 'lobby', 'cabinet', 'table', 'game']) {
    $('#screen-' + s).classList.toggle('hidden', s !== name);
  }
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const RED = { '♥': 1, '♦': 1 };
function cardHTML(c, cls = '') {
  const red = RED[c.s] ? ' red' : '';
  const face = (c.r === 'J' || c.r === 'Q' || c.r === 'K')
    ? `<div class="face">${{ J: 'В', Q: 'Д', K: 'К' }[c.r]}</div>`
    : (c.r === 'A' ? '<div class="face">Т</div>' : `<div class="pip">${c.s}</div>`);
  const rr = { J: 'В', Q: 'Д', K: 'К', A: 'Т' }[c.r] || c.r;
  return `<div class="card${red} ${cls}" data-id="${c.id}">
    <div class="corner">${rr}\n${c.s}</div>${face}<div class="corner b">${rr}\n${c.s}</div>
  </div>`;
}

// ---------- лобби ----------

function renderLobby(m) {
  $('#lobby-name').textContent = store.name;
  $('#lobby-acc-badge').classList.toggle('hidden', !account);
  const list = $('#tables-list');
  if (!m.tables.length) {
    list.innerHTML = '<div class="empty">Пока нет открытых столов — создайте свой</div>';
    return;
  }
  list.innerHTML = m.tables.map(t => `
    <div class="table-row">
      <div><span class="tname">${esc(t.name)}</span>
        <span class="tmeta">${t.players}/6 · код ${t.id}</span></div>
      <button class="btn tiny" data-join="${t.id}">Сесть</button>
    </div>`).join('');
  list.querySelectorAll('[data-join]').forEach(b => {
    b.onclick = () => sendMsg({ type: 'joinTable', id: b.dataset.join });
  });
}

// ---------- стол до игры ----------

function renderTable(m) {
  $('#table-title').textContent = m.name;
  $('#table-code').textContent = m.id;
  $('#table-players').innerHTML = m.players.map(p => `
    <div class="seat${p.connected ? '' : ' offline'}">
      <span class="dot"></span>
      <b>${esc(p.name)}${p.you ? ' (вы)' : ''}</b>
      ${p.host ? '<span class="tag">создатель</span>' : ''}
    </div>`).join('');
  const canStart = m.youAreHost && m.players.length >= 2;
  $('#start-btn').classList.toggle('hidden', !m.youAreHost);
  $('#start-btn').disabled = !canStart;
  $('#start-btn').textContent = m.players.length >= 2
    ? 'Начать игру' : 'Начать игру (нужно ≥ 2)';
  $('#wait-host').classList.toggle('hidden', m.youAreHost);
}

// ---------- игра ----------

const SUIT_LABEL = { '♠': 'пики', '♣': 'трефы', '♥': 'червы', '♦': 'бубны' };

function renderGame(g) {
  $('#g-table-name').textContent = `${g.tableName} · код ${g.tableId}`;
  $('#g-round').textContent = `раунд ${g.round}`;

  // соперники (и я в общем ряду, если игроков > 2 — показываем всех кроме себя)
  const opp = $('#opponents');
  opp.innerHTML = g.players.map((p, i) => {
    if (p.you) return '';
    const cls = [
      'opp',
      i === g.turnIdx ? 'turn' : '',
      p.eliminated ? 'out' : '',
      p.connected ? '' : 'offline',
    ].join(' ');
    const n = Math.min(p.count, 8);
    let minis = '';
    for (let k = 0; k < n; k++) minis += '<div class="mini"></div>';
    if (p.count > 8) minis += `<span class="more">+${p.count - 8}</span>`;
    if (p.count === 0 && !p.eliminated) minis = '<span class="more">—</span>';
    return `<div class="${cls}">
      <div class="opp-name">${i === g.dealerIdx ? '<span class="dealer">◈</span> ' : ''}${esc(p.name)}</div>
      <div class="opp-cards">${minis}</div>
      <div class="opp-score">${p.score} очк.</div>
    </div>`;
  }).join('');

  // центр стола
  $('#deck-count').textContent = g.deckCount;
  const disc = $('#discard-pile');
  const top = g.top;
  disc.innerHTML = top ? cardHTML(top) : '';
  const tilt = ((g.round * 7) % 11) - 5;
  if (disc.firstElementChild) disc.firstElementChild.style.transform = `rotate(${tilt}deg)`;

  const badges = [];
  if (g.jackSuit) {
    const red = RED[g.jackSuit] ? 'red' : '';
    badges.push(`<span class="badge">заказано: <span class="${red}">${g.jackSuit}</span> ${SUIT_LABEL[g.jackSuit]}</span>`);
  }
  if (g.pendingDraw > 0) badges.push(`<span class="badge alarm">восьмёрки: +${g.pendingDraw}</span>`);
  if (g.kingStreak > 0) badges.push(`<span class="badge">короли: ${'♚'.repeat(g.kingStreak)}${'·'.repeat(4 - g.kingStreak)}</span>`);
  $('#badges').innerHTML = badges.join('');

  // статус
  const st = $('#status');
  st.className = 'status';
  const turnP = g.players[g.turnIdx];
  if (g.phase === 'playing') {
    if (g.youIdx === g.turnIdx) {
      st.classList.add('mine');
      if (g.mustPlayEight) { st.classList.add('warn'); st.textContent = 'Вы обязаны положить восьмёрку!'; }
      else if (g.mustCoverSix) { st.classList.add('warn'); st.textContent = 'Накройте шестёрку (или берите из прикупа)'; }
      else if (g.drew) st.textContent = 'Сыграйте взятую карту или пасуйте';
      else st.textContent = 'Ваш ход';
    } else {
      st.textContent = turnP ? `Ходит ${turnP.name}…` : '';
    }
  } else {
    st.textContent = '';
  }

  // рука
  const hand = $('#hand');
  const myTurn = g.phase === 'playing' && g.youIdx === g.turnIdx;
  hand.innerHTML = g.hand.map(c =>
    cardHTML(c, c.playable ? 'playable' : (myTurn ? 'dim' : ''))
  ).join('');
  hand.querySelectorAll('.card.playable').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.id;
      const card = g.hand.find(x => x.id === id);
      if (card && card.r === 'J') openSuitModal(id);
      else sendMsg({ type: 'playCard', cardId: id });
    };
  });

  // кнопки
  $('#draw-btn').disabled = !g.canDraw;
  $('#pass-btn').disabled = !g.canPass;
  const dumpBtn = $('#dump-jacks-btn');
  if (g.canDumpJacks) {
    const n = g.hand.length;
    dumpBtn.textContent = `Скинуть ${n} валета (×${n + 1})`;
    dumpBtn.classList.remove('hidden');
  } else {
    dumpBtn.classList.add('hidden');
  }

  // моя строка
  const me = g.players[g.youIdx];
  $('#me-info').textContent = me
    ? `${me.name} · ${me.score} очк.${g.youIdx === g.dealerIdx ? ' · вы раздаёте' : ''}${me.eliminated ? ' · вы выбыли' : ''}`
    : '';

  renderLog(g);
  renderModals(g);
}

function renderLog(g) {
  const log = $('#log');
  const entries = g.log.map(l =>
    `<div class="entry${l.startsWith('—') ? ' round' : ''}">${esc(l)}</div>`);
  const chat = chatLines.map(c =>
    `<div class="entry chat"><b>${esc(c.from)}:</b> ${esc(c.text)}</div>`);
  log.innerHTML = entries.join('') + chat.join('');
  log.scrollTop = log.scrollHeight;
}

function resultsTable(rows) {
  return rows.map(r => `
    <tr class="${r.winner ? 'win' : ''}">
      <td>${r.winner ? '★ ' : ''}${esc(r.name)}</td>
      <td class="num">+${r.pts}</td>
      <td class="num"><b>${r.score}</b></td>
      <td class="note">${esc(r.note || '')}</td>
    </tr>`).join('');
}

function renderModals(g) {
  // итоги раунда
  const rm = $('#round-modal');
  if (g.phase === 'roundEnd' && g.roundResults) {
    $('#round-title').textContent = `Раунд ${g.round} окончен`;
    $('#round-results').innerHTML = resultsTable(g.roundResults);
    $('#next-round-btn').classList.toggle('hidden', !g.youAreHost);
    $('#next-round-wait').classList.toggle('hidden', g.youAreHost);
    rm.classList.remove('hidden');
  } else {
    rm.classList.add('hidden');
  }

  // конец партии
  const om = $('#over-modal');
  if (g.phase === 'over') {
    $('#winner-line').innerHTML = `Победитель — <b>${esc(g.winner || '')}</b>`;
    $('#over-results').innerHTML = g.roundResults ? resultsTable(g.roundResults) : '';
    $('#rematch-btn').classList.toggle('hidden', !g.youAreHost);
    $('#rematch-wait').classList.toggle('hidden', g.youAreHost);
    om.classList.remove('hidden');
  } else {
    om.classList.add('hidden');
  }
}

// ---------- выбор масти ----------

let suitCardId = null;
let suitMode = 'play';           // 'play' — обычный валет, 'dump' — скинуть все валеты
function openSuitModal(cardId) {
  suitMode = 'play';
  suitCardId = cardId;
  $('#suit-modal').classList.remove('hidden');
}
function openSuitModalDump() {
  suitMode = 'dump';
  suitCardId = null;
  $('#suit-modal').classList.remove('hidden');
}
document.querySelectorAll('.suit-btn').forEach(b => {
  b.onclick = () => {
    $('#suit-modal').classList.add('hidden');
    if (suitMode === 'dump') sendMsg({ type: 'dumpJacks', suit: b.dataset.suit });
    else if (suitCardId) sendMsg({ type: 'playCard', cardId: suitCardId, suit: b.dataset.suit });
    suitCardId = null;
    suitMode = 'play';
  };
});
$('#suit-cancel').onclick = () => {
  suitCardId = null;
  suitMode = 'play';
  $('#suit-modal').classList.add('hidden');
};

// ---------- обработчики ----------

// переключение вкладок входа
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    for (const name of ['guest', 'login', 'register']) {
      $('#tab-' + name).classList.toggle('hidden', name !== tab.dataset.tab);
    }
    authError('');
  };
});

function guestEnter() {
  const v = $('#name-input').value.trim();
  if (!v) { authError('Введите имя'); return; }
  store.auth = '';           // играем как гость
  account = null;
  store.name = v;
  if (wsReady) sendMsg({ type: 'hello', name: v, token: store.token });
  else connect();
}
$('#name-btn').onclick = guestEnter;
$('#name-input').addEventListener('keydown', e => { if (e.key === 'Enter') guestEnter(); });

function doLogin() {
  const login = $('#login-user').value.trim();
  const pass = $('#login-pass').value;
  if (!login || !pass) { authError('Введите логин и пароль'); return; }
  ensureConnected(() => sendMsg({ type: 'login', login, password: pass }));
}
$('#login-btn').onclick = doLogin;
$('#login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function doRegister() {
  const login = $('#reg-user').value.trim();
  const name = $('#reg-name').value.trim();
  const pass = $('#reg-pass').value;
  if (!login || !pass) { authError('Введите логин и пароль'); return; }
  ensureConnected(() => sendMsg({ type: 'register', login, name, password: pass }));
}
$('#reg-btn').onclick = doRegister;
$('#reg-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });

// гарантируем соединение, затем выполняем действие
function ensureConnected(fn) {
  if (wsReady) { fn(); return; }
  pendingOpen = fn;
  connect();
}

$('#change-name').onclick = (e) => {
  e.preventDefault();
  $('#name-input').value = store.name;
  show('name');
};

// личный кабинет
$('#cabinet-link').onclick = (e) => {
  e.preventDefault();
  openCabinet();
};
$('#cabinet-back').onclick = () => show('lobby');
$('#logout-btn').onclick = () => sendMsg({ type: 'logout', auth: store.auth });

function openCabinet() {
  lastProfile = null; lastLeaderboard = null;
  renderCabinet(); renderLeaderboard();
  if (account) sendMsg({ type: 'getProfile', auth: store.auth });
  sendMsg({ type: 'getLeaderboard' });
  show('cabinet');
}

function renderCabinet() {
  const box = $('#cabinet-stats');
  $('#logout-btn').classList.toggle('hidden', !account);
  if (!account) {
    box.innerHTML = '<p class="muted">Вы играете как гость. Войдите в аккаунт, чтобы сохранять статистику и попадать в топ-100.</p>';
    return;
  }
  const s = lastProfile;
  if (!s) { box.innerHTML = '<p class="muted">Загрузка…</p>'; return; }
  box.innerHTML = `
    <div class="stat-name">${esc(s.name)} <span class="muted">@${esc(s.login)}</span></div>
    <div class="stat-grid">
      <div class="stat"><div class="stat-val">#${s.rank}</div><div class="stat-lbl">место</div></div>
      <div class="stat"><div class="stat-val">${s.gamesWon}</div><div class="stat-lbl">побед</div></div>
      <div class="stat"><div class="stat-val">${s.gamesPlayed}</div><div class="stat-lbl">партий</div></div>
      <div class="stat"><div class="stat-val">${s.winrate}%</div><div class="stat-lbl">винрейт</div></div>
      <div class="stat"><div class="stat-val">${s.roundsWon}</div><div class="stat-lbl">раундов</div></div>
    </div>`;
}

function renderLeaderboard() {
  const box = $('#leaderboard');
  const rows = lastLeaderboard;
  if (!rows) { box.innerHTML = '<div class="muted">Загрузка…</div>'; return; }
  if (!rows.length) { box.innerHTML = '<div class="muted">Пока нет сыгранных партий</div>'; return; }
  box.innerHTML = rows.map((r, i) => `
    <div class="lb-row${account && r.name === account.name ? ' me' : ''}">
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-name">${esc(r.name)}</span>
      <span class="lb-won">${r.games_won} побед</span>
      <span class="lb-played muted">${r.games_played} партий</span>
    </div>`).join('');
}

$('#create-btn').onclick = () => sendMsg({ type: 'createTable', name: $('#table-name-input').value });
$('#join-code-btn').onclick = () => {
  const c = $('#join-code-input').value.trim().toUpperCase();
  if (c.length === 4) sendMsg({ type: 'joinTable', id: c });
  else toast('Код стола — 4 символа');
};
$('#join-code-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#join-code-btn').click(); });

$('#start-btn').onclick = () => sendMsg({ type: 'startGame' });
$('#leave-btn').onclick = () => sendMsg({ type: 'leaveTable' });
$('#g-leave').onclick = () => {
  if (lastGame && lastGame.phase === 'playing') {
    if (!confirm('Выйти из идущей игры? Вы выбудете из партии.')) return;
  }
  lastGame = null;
  sendMsg({ type: 'leaveTable' });
};

$('#draw-btn').onclick = () => sendMsg({ type: 'drawCard' });
$('#dump-jacks-btn').onclick = () => openSuitModalDump();
$('#pass-btn').onclick = () => sendMsg({ type: 'endTurn' });
$('#next-round-btn').onclick = () => sendMsg({ type: 'nextRound' });
$('#rematch-btn').onclick = () => sendMsg({ type: 'startGame' });
$('#over-leave-btn').onclick = () => { lastGame = null; sendMsg({ type: 'leaveTable' }); };

function sendChat() {
  const v = $('#chat-input').value.trim();
  if (!v) return;
  sendMsg({ type: 'chat', text: v });
  $('#chat-input').value = '';
}
$('#chat-btn').onclick = sendChat;
$('#chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

$('#g-log-toggle').onclick = () => $('#side').classList.toggle('open');
$('#side-close').onclick = () => $('#side').classList.remove('open');

// ---------- таймер хода ----------

let turnDeadline = null;   // локальный дедлайн (Date.now-шкала) или null
function updateTurnDeadline(g) {
  if (g.phase === 'playing' && typeof g.turnMsLeft === 'number') {
    turnDeadline = Date.now() + g.turnMsLeft;
  } else {
    turnDeadline = null;
  }
}
function tickTimer() {
  const el = $('#g-timer');
  if (!el) return;
  if (turnDeadline === null || !lastGame || lastGame.phase !== 'playing') {
    el.classList.add('hidden');
    return;
  }
  const left = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
  const mine = lastGame.youIdx === lastGame.turnIdx;
  el.textContent = `⏱ ${left}`;
  el.classList.remove('hidden');
  el.classList.toggle('low', left <= 10);
  el.classList.toggle('mine', mine);
}
setInterval(tickTimer, 250);

// ---------- звук наступления хода ----------

let audioCtx = null;
let soundOn = localStorage.getItem('g125_sound') !== 'off';
let wasMyTurn = false;

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) { try { audioCtx = new AC(); } catch { audioCtx = null; } }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
// разблокировать звук на первом действии пользователя (политика браузеров)
window.addEventListener('pointerdown', ensureAudio, { once: true });
window.addEventListener('keydown', ensureAudio, { once: true });

function playTurnChime() {
  if (!soundOn) return;
  ensureAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const notes = [[880, 0], [1174.66, 0.12]]; // A5 → D6, короткий приятный сигнал
  for (const [freq, t] of notes) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(audioCtx.destination);
    const s = now + t;
    gain.gain.setValueAtTime(0.0001, s);
    gain.gain.exponentialRampToValueAtTime(0.22, s + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, s + 0.25);
    osc.start(s); osc.stop(s + 0.28);
  }
}

function maybePlayTurnSound(g) {
  const isMyTurn = g.phase === 'playing' && g.youIdx === g.turnIdx;
  if (isMyTurn && !wasMyTurn) playTurnChime();
  wasMyTurn = isMyTurn;
}

function refreshSoundBtn() {
  const b = $('#g-sound');
  if (b) { b.textContent = soundOn ? '🔔' : '🔕'; b.title = soundOn ? 'Звук хода: вкл' : 'Звук хода: выкл'; }
}
$('#g-sound').onclick = () => {
  soundOn = !soundOn;
  localStorage.setItem('g125_sound', soundOn ? 'on' : 'off');
  refreshSoundBtn();
  if (soundOn) playTurnChime(); // короткий предпросмотр
};
refreshSoundBtn();

// ---------- старт ----------

const buildTag = $('#build-tag');
if (buildTag) buildTag.textContent = 'build ' + BUILD;
if (store.name) $('#name-input').value = store.name;
show('name');
connect();
