'use strict';

/* Клиент игры «Бридж» */

const BUILD = 'final-table-2026-07-15';
console.log('Бридж client build:', BUILD);

const $ = (s) => document.querySelector(s);

// ---------- локализация ----------

const I18N = {
  ru: {
    tagline: 'карточная игра за общим столом · 2–6 игроков',
    tabGuest: 'Гость', tabLogin: 'Вход', tabRegister: 'Регистрация',
    yourName: 'Ваше имя', toTable: 'За стол',
    guestHint: 'Быстрый вход без регистрации. Статистика гостей не сохраняется.',
    login: 'Логин', password: 'Пароль', signIn: 'Войти',
    regLogin: 'Логин (3–20, латиница/цифры)', displayName: 'Отображаемое имя (необязательно)',
    regPass: 'Пароль (мин. 6)', createAccount: 'Создать аккаунт',
    youAre: 'Вы —', deckTitle: 'Прикуп', lobby: 'Лобби', you: 'вы', account: 'аккаунт', cabinet: 'кабинет', change: 'сменить',
    openTables: 'Открытые столы', noTables: 'Пока нет открытых столов — создайте свой',
    ownTable: 'Свой стол', tableNamePh: 'Название стола (необязательно)', create: 'Создать',
    joinByCode: 'Присоединиться по коду', codePh: 'Код, напр. K7XM', enter: 'Войти',
    sit: 'Сесть', codeForFriends: 'Код для друзей:',
    addBot: 'Добавить бота', removeBot: 'Убрать бота',
    startGame: 'Начать игру', startNeed2: 'Начать игру (нужно ≥ 2)',
    waitHost: 'Ждём, пока создатель стола начнёт игру…', leave: 'Выйти',
    host: 'создатель', bot: 'бот',
    cabinetTitle: 'Личный кабинет', top100: 'Топ-100 по победам',
    toLobby: '← В лобби', manageAccounts: 'Управление аккаунтами', logout: 'Выйти из аккаунта',
    guestCabinet: 'Вы играете как гость. Войдите в аккаунт, чтобы сохранять статистику и попадать в топ-100.',
    loading: 'Загрузка…', rankL: 'место', winsL: 'побед', gamesL: 'партий', winrateL: 'винрейт', roundsL: 'раундов',
    noGames: 'Пока нет сыгранных партий', winsShort: 'побед', gamesShort: 'партий',
    round: 'раунд', log: 'Журнал', logChat: 'Журнал и чат', sound: 'Звук хода',
    takeCard: 'Взять карту', pass: 'Пас',
    yourTurn: 'Ваш ход', mustEight: 'Вы обязаны положить восьмёрку!',
    mustCover: 'Накройте шестёрку (или берите из прикупа)',
    playDrawn: 'Сыграйте взятую карту или пасуйте',
    jackChoose: 'Валет: закажите масть', cancel: 'Отмена',
    nextRound: 'Следующий раунд', waitHostShort: 'Ждём создателя стола…',
    gameOver: 'Партия окончена', winnerIs: 'Победитель —', rematch: 'Сыграть ещё',
    playerCol: 'Игрок', scoreCol: 'Очки', roundsCol: 'Раунды',
    winnerNote: 'победитель', outNote: 'выбыл',
    rematchWait: 'Создатель стола может начать новую партию', leaveToLobby: 'Выйти в лобби',
    youDeal: 'вы раздаёте', youOut: 'вы выбыли', lastCard: 'последняя карта!',
    chatPh: 'Сообщение столу…', enterName: 'Введите имя', code4: 'Код стола — 4 символа',
    needLoginPass: 'Введите логин и пароль',
    refresh: 'Обновить', save: 'Сохранить', del: 'Удалить', newPass: 'Новый пароль',
    emptyKeep: 'оставить пустым', adminFlag: 'админ', backCabinet: '← В кабинет',
    reconnecting: 'Переподключение…',
  },
  en: {
    tagline: 'card game at a shared table · 2–6 players',
    tabGuest: 'Guest', tabLogin: 'Sign in', tabRegister: 'Sign up',
    yourName: 'Your name', toTable: 'Play',
    guestHint: 'Quick play without registration. Guest stats are not saved.',
    login: 'Login', password: 'Password', signIn: 'Sign in',
    regLogin: 'Login (3–20, latin/digits)', displayName: 'Display name (optional)',
    regPass: 'Password (min. 6)', createAccount: 'Create account',
    youAre: 'You —', deckTitle: 'Deck', lobby: 'Lobby', you: 'you', account: 'account', cabinet: 'profile', change: 'change',
    openTables: 'Open tables', noTables: 'No open tables yet — create your own',
    ownTable: 'Your table', tableNamePh: 'Table name (optional)', create: 'Create',
    joinByCode: 'Join by code', codePh: 'Code, e.g. K7XM', enter: 'Join',
    sit: 'Sit', codeForFriends: 'Code for friends:',
    addBot: 'Add bot', removeBot: 'Remove bot',
    startGame: 'Start game', startNeed2: 'Start game (need ≥ 2)',
    waitHost: 'Waiting for the host to start the game…', leave: 'Leave',
    host: 'host', bot: 'bot',
    cabinetTitle: 'Profile', top100: 'Top 100 by wins',
    toLobby: '← To lobby', manageAccounts: 'Manage accounts', logout: 'Log out',
    guestCabinet: 'You are playing as a guest. Sign in to save stats and enter the top 100.',
    loading: 'Loading…', rankL: 'rank', winsL: 'wins', gamesL: 'games', winrateL: 'winrate', roundsL: 'rounds',
    noGames: 'No games played yet', winsShort: 'wins', gamesShort: 'games',
    round: 'round', log: 'Log', logChat: 'Log & chat', sound: 'Turn sound',
    takeCard: 'Draw card', pass: 'Pass',
    yourTurn: 'Your turn', mustEight: 'You must play an eight!',
    mustCover: 'Cover the six (or draw from the deck)',
    playDrawn: 'Play the drawn card or pass',
    jackChoose: 'Jack: choose a suit', cancel: 'Cancel',
    nextRound: 'Next round', waitHostShort: 'Waiting for the host…',
    gameOver: 'Game over', winnerIs: 'Winner —', rematch: 'Play again',
    playerCol: 'Player', scoreCol: 'Score', roundsCol: 'Rounds',
    winnerNote: 'winner', outNote: 'out',
    rematchWait: 'The host can start a new game', leaveToLobby: 'Back to lobby',
    youDeal: 'you deal', youOut: 'you are out', lastCard: 'last card!',
    chatPh: 'Message to the table…', enterName: 'Enter a name', code4: 'Table code is 4 characters',
    needLoginPass: 'Enter login and password',
    refresh: 'Refresh', save: 'Save', del: 'Delete', newPass: 'New password',
    emptyKeep: 'leave empty', adminFlag: 'admin', backCabinet: '← To profile',
    reconnecting: 'Reconnecting…',
  },
};

let lang = localStorage.getItem('g125_lang');
if (!lang) lang = (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'ru';
if (!I18N[lang]) lang = 'ru';
function t(key, arg) {
  let v = (I18N[lang] && I18N[lang][key] != null) ? I18N[lang][key] : I18N.ru[key];
  if (v == null) return key;
  return typeof v === 'function' ? v(arg) : v;
}
function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.documentElement.lang = lang;
  const lb = $('#lang-toggle'); if (lb) lb.textContent = lang === 'ru' ? 'EN' : 'RU';
}
function setLang(l) {
  lang = I18N[l] ? l : 'ru';
  localStorage.setItem('g125_lang', lang);
  applyStaticI18n();
  if (typeof refreshSoundBtn === 'function') refreshSoundBtn();
  if (lastGame) renderGame(lastGame);
  if (lastLobby) renderLobby(lastLobby);
}

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
    $('#conn').textContent = t('reconnecting');
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
      account = { login: m.login, name: m.name, isAdmin: !!m.isAdmin };
      lastProfile = m.stats || null;
      authError('');
      // входим в игру под аккаунтом
      sendMsg({ type: 'hello', auth: store.auth, token: store.token });
      break;
    case 'adminUsers':
      lastAdminUsers = m.users;
      renderAdminUsers(m.notice);
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
      lastLobby = m;
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
      armResultsLock(m);
      maybePlayTurnSound(m);
      maybePlayWhip(m);
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
let lastAdminUsers = null;
let lastLobby = null;

function authError(msg) {
  const el = $('#auth-error');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

// ---------- утилиты UI ----------

function show(name) {
  currentScreen = name;
  for (const s of ['name', 'lobby', 'cabinet', 'admin', 'table', 'game']) {
    $('#screen-' + s).classList.toggle('hidden', s !== name);
  }
}

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
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
  $('#lobby-acc-badge').textContent = t('account');
  const list = $('#tables-list');
  if (!m.tables.length) {
    list.innerHTML = `<div class="empty">${t('noTables')}</div>`;
    return;
  }
  list.innerHTML = m.tables.map(tbl => `
    <div class="table-row">
      <div><span class="tname">${esc(tbl.name)}</span>
        <span class="tmeta">${tbl.players}/6 · ${tbl.id}</span></div>
      <button class="btn tiny" data-join="${tbl.id}">${t('sit')}</button>
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
      <b>${esc(p.name)}${p.you ? ' (' + t('you') + ')' : ''}</b>
      ${p.isBot ? `<span class="tag bot">${t('bot')}</span>` : ''}
      ${p.host ? `<span class="tag">${t('host')}</span>` : ''}
    </div>`).join('');
  const canStart = m.youAreHost && m.players.length >= 2;
  $('#start-btn').classList.toggle('hidden', !m.youAreHost);
  $('#start-btn').disabled = !canStart;
  $('#start-btn').textContent = m.players.length >= 2 ? t('startGame') : t('startNeed2');
  $('#wait-host').classList.toggle('hidden', m.youAreHost);

  const bots = m.players.filter(p => p.isBot).length;
  $('#add-bot-btn').classList.toggle('hidden', !m.youAreHost || m.players.length >= 6);
  $('#remove-bot-btn').classList.toggle('hidden', !m.youAreHost || bots === 0);
}

// ---------- игра ----------

const SUIT_LABEL = { '♠': 'пики', '♣': 'трефы', '♥': 'червы', '♦': 'бубны' };

function renderGame(g) {
  $('#g-table-name').textContent = `${g.tableName} · ${g.tableId}`;
  $('#g-round').textContent = `${t('round')} ${g.round}`;

  // соперники (и я в общем ряду, если игроков > 2 — показываем всех кроме себя)
  const opp = $('#opponents');
  const ptsLbl = lang === 'en' ? 'pts' : 'очк.';
  opp.innerHTML = g.players.map((p, i) => {
    if (p.you) return '';
    const cls = [
      'opp',
      i === g.turnIdx ? 'turn' : '',
      p.eliminated ? 'out' : '',
      p.connected ? '' : 'offline',
      (p.count === 1 && !p.eliminated) ? 'one-card' : '',
    ].join(' ');
    const n = Math.min(p.count, 8);
    let minis = '';
    for (let k = 0; k < n; k++) minis += '<div class="mini"></div>';
    if (p.count > 8) minis += `<span class="more">+${p.count - 8}</span>`;
    if (p.count === 0 && !p.eliminated) minis = '<span class="more">—</span>';
    const score = p.eliminated ? (lang === 'en' ? 'out' : 'выбыл') : `${p.score} ${ptsLbl}`;
    return `<div class="${cls}">
      <div class="opp-name">${i === g.dealerIdx ? '<span class="dealer">◈</span> ' : ''}${esc(p.name)}</div>
      <div class="opp-cards">${minis}</div>
      <div class="opp-score">${score}</div>
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
      if (g.mustPlayEight) { st.classList.add('warn'); st.textContent = t('mustEight'); }
      else if (g.mustCoverSix) { st.classList.add('warn'); st.textContent = t('mustCover'); }
      else if (g.drew) st.textContent = t('playDrawn');
      else st.textContent = t('yourTurn');
    } else {
      st.textContent = turnP ? `${turnP.name}…` : '';
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
  $('#draw-btn').textContent = t('takeCard');
  $('#pass-btn').disabled = !g.canPass;
  $('#pass-btn').textContent = t('pass');
  const dumpBtn = $('#dump-jacks-btn');
  if (g.canDumpJacks) {
    const n = g.hand.length;
    dumpBtn.textContent = lang === 'en' ? `Dump ${n} jacks (×${n + 1})` : `Скинуть ${n} валета (×${n + 1})`;
    dumpBtn.classList.remove('hidden');
  } else {
    dumpBtn.classList.add('hidden');
  }

  // моя строка
  const me = g.players[g.youIdx];
  const meInfo = $('#me-info');
  meInfo.textContent = me
    ? `${me.name} · ${me.score} ${ptsLbl}${g.youIdx === g.dealerIdx ? ' · ' + t('youDeal') : ''}${me.eliminated ? ' · ' + t('youOut') : ''}${me && me.count === 1 && !me.eliminated ? ' · ' + t('lastCard') : ''}`
    : '';
  meInfo.classList.toggle('one-card', !!(me && me.count === 1 && !me.eliminated));

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

function finalTable(rows) {
  const head = `<tr class="hrow">
      <th class="num">#</th><th>${t('playerCol')}</th>
      <th class="num">${t('scoreCol')}</th><th class="num">${t('roundsCol')}</th><th></th>
    </tr>`;
  const body = rows.map((r, i) => `
    <tr class="${r.winner ? 'win' : ''}${r.eliminated ? ' out' : ''}">
      <td class="num">${i + 1}</td>
      <td>${r.winner ? '★ ' : ''}${esc(r.name)}${r.isBot ? ` <span class="tag bot">${t('bot')}</span>` : ''}</td>
      <td class="num"><b>${r.score}</b></td>
      <td class="num">${r.roundsWon}</td>
      <td class="note">${r.winner ? t('winnerNote') : (r.eliminated ? t('outNote') : '')}</td>
    </tr>`).join('');
  return head + body;
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

const RESULTS_LOCK_MS = 7000;
let resultsLockUntil = 0;
let resultsLockPhase = null;

function armResultsLock(g) {
  // взводим блокировку один раз при появлении таблицы (переход в roundEnd/over)
  if ((g.phase === 'roundEnd' || g.phase === 'over') && resultsLockPhase !== g.phase) {
    resultsLockUntil = Date.now() + RESULTS_LOCK_MS;
  }
  if (g.phase !== 'roundEnd' && g.phase !== 'over') resultsLockPhase = null;
  else resultsLockPhase = g.phase;
}

function tickResultsLock() {
  if (!lastGame) return;
  const locked = Date.now() < resultsLockUntil;
  const secs = Math.max(0, Math.ceil((resultsLockUntil - Date.now()) / 1000));
  if (lastGame.phase === 'roundEnd' && lastGame.youAreHost) {
    const b = $('#next-round-btn');
    b.disabled = locked;
    b.textContent = locked ? `${t('nextRound')} (${secs})` : t('nextRound');
  }
  if (lastGame.phase === 'over' && lastGame.youAreHost) {
    const b = $('#rematch-btn');
    b.disabled = locked;
    b.textContent = locked ? `${t('rematch')} (${secs})` : t('rematch');
  }
}

function renderModals(g) {
  // итоги раунда
  const rm = $('#round-modal');
  if (g.phase === 'roundEnd' && g.roundResults) {
    $('#round-title').textContent = lang === 'en' ? `Round ${g.round} over` : `Раунд ${g.round} окончен`;
    $('#round-results').innerHTML = resultsTable(g.roundResults);
    $('#next-round-wait').textContent = t('waitHostShort');
    $('#next-round-btn').classList.toggle('hidden', !g.youAreHost);
    $('#next-round-wait').classList.toggle('hidden', g.youAreHost);
    rm.classList.remove('hidden');
  } else {
    rm.classList.add('hidden');
  }

  // конец партии
  const om = $('#over-modal');
  if (g.phase === 'over') {
    $('#over-title').textContent = t('gameOver');
    $('#winner-line').innerHTML = `${t('winnerIs')} <b>${esc(g.winner || '')}</b>`;
    $('#over-results').innerHTML = g.finalResults
      ? finalTable(g.finalResults)
      : (g.roundResults ? resultsTable(g.roundResults) : '');
    $('#rematch-wait').textContent = t('rematchWait');
    $('#over-leave-btn').textContent = t('leaveToLobby');
    $('#rematch-btn').classList.toggle('hidden', !g.youAreHost);
    $('#rematch-wait').classList.toggle('hidden', g.youAreHost);
    om.classList.remove('hidden');
  } else {
    om.classList.add('hidden');
  }

  tickResultsLock();
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
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    tab.classList.add('active');
    for (const name of ['guest', 'login', 'register']) {
      $('#tab-' + name).classList.toggle('hidden', name !== tab.dataset.tab);
    }
    authError('');
  };
});

function guestEnter() {
  const v = $('#name-input').value.trim();
  if (!v) { authError(t('enterName')); return; }
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
  if (!login || !pass) { authError(t('needLoginPass')); return; }
  ensureConnected(() => sendMsg({ type: 'login', login, password: pass }));
}
$('#login-btn').onclick = doLogin;
$('#login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function doRegister() {
  const login = $('#reg-user').value.trim();
  const name = $('#reg-name').value.trim();
  const pass = $('#reg-pass').value;
  if (!login || !pass) { authError(t('needLoginPass')); return; }
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

// ---------- админка ----------

$('#admin-open').onclick = () => openAdmin();
$('#admin-back').onclick = () => show('cabinet');
$('#admin-refresh').onclick = () => sendMsg({ type: 'adminListUsers', auth: store.auth });

function openAdmin() {
  if (!(account && account.isAdmin)) { toast('Нужны права администратора'); return; }
  lastAdminUsers = null;
  renderAdminUsers();
  sendMsg({ type: 'adminListUsers', auth: store.auth });
  show('admin');
}

function renderAdminUsers(notice) {
  const nb = $('#admin-notice');
  if (notice) { nb.textContent = notice; nb.classList.remove('hidden'); }
  else nb.classList.add('hidden');

  const box = $('#admin-users');
  const users = lastAdminUsers;
  if (!users) { box.innerHTML = `<div class="muted">${t('loading')}</div>`; return; }
  if (!users.length) { box.innerHTML = `<div class="muted">${lang === 'en' ? 'No accounts' : 'Нет аккаунтов'}</div>`; return; }
  box.innerHTML = users.map(u => `
    <div class="admin-row" data-id="${u.id}">
      <div class="admin-fields">
        <label>${t('login')}<input class="au-login" type="text" maxlength="20" value="${esc(u.login)}"></label>
        <label>${lang === 'en' ? 'Name' : 'Имя'}<input class="au-name" type="text" maxlength="20" value="${esc(u.name)}"></label>
        <label>${t('newPass')}<input class="au-pass" type="text" maxlength="72" placeholder="${t('emptyKeep')}"></label>
        <label class="au-admin-lbl"><input class="au-admin" type="checkbox" ${u.isAdmin ? 'checked' : ''}> ${t('adminFlag')}</label>
      </div>
      <div class="admin-meta">
        <span class="muted">id ${u.id} · ${u.gamesWon} ${t('winsShort')} / ${u.gamesPlayed} ${t('gamesShort')}</span>
        <div class="admin-btns">
          <button class="btn tiny au-save">${t('save')}</button>
          <button class="btn tiny ghost au-del">${t('del')}</button>
        </div>
      </div>
    </div>`).join('');

  box.querySelectorAll('.admin-row').forEach(row => {
    const id = Number(row.dataset.id);
    row.querySelector('.au-save').onclick = () => {
      sendMsg({
        type: 'adminUpdateUser', auth: store.auth, id,
        login: row.querySelector('.au-login').value.trim(),
        name: row.querySelector('.au-name').value.trim(),
        password: row.querySelector('.au-pass').value,
        isAdmin: row.querySelector('.au-admin').checked,
      });
    };
    row.querySelector('.au-del').onclick = () => {
      const login = row.querySelector('.au-login').value.trim();
      const msg = lang === 'en' ? `Delete account “${login}”? This cannot be undone.` : `Удалить аккаунт «${login}»? Это необратимо.`;
      if (confirm(msg)) {
        sendMsg({ type: 'adminDeleteUser', auth: store.auth, id });
      }
    };
  });
}

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
  $('#admin-open').classList.toggle('hidden', !(account && account.isAdmin));
  if (!account) {
    box.innerHTML = `<p class="muted">${t('guestCabinet')}</p>`;
    return;
  }
  const s = lastProfile;
  if (!s) { box.innerHTML = `<p class="muted">${t('loading')}</p>`; return; }
  box.innerHTML = `
    <div class="stat-name">${esc(s.name)} <span class="muted">@${esc(s.login)}</span></div>
    <div class="stat-grid">
      <div class="stat"><div class="stat-val">#${s.rank}</div><div class="stat-lbl">${t('rankL')}</div></div>
      <div class="stat"><div class="stat-val">${s.gamesWon}</div><div class="stat-lbl">${t('winsL')}</div></div>
      <div class="stat"><div class="stat-val">${s.gamesPlayed}</div><div class="stat-lbl">${t('gamesL')}</div></div>
      <div class="stat"><div class="stat-val">${s.winrate}%</div><div class="stat-lbl">${t('winrateL')}</div></div>
      <div class="stat"><div class="stat-val">${s.roundsWon}</div><div class="stat-lbl">${t('roundsL')}</div></div>
    </div>`;
}

function renderLeaderboard() {
  const box = $('#leaderboard');
  const rows = lastLeaderboard;
  if (!rows) { box.innerHTML = `<div class="muted">${t('loading')}</div>`; return; }
  if (!rows.length) { box.innerHTML = `<div class="muted">${t('noGames')}</div>`; return; }
  box.innerHTML = rows.map((r, i) => `
    <div class="lb-row${account && r.name === account.name ? ' me' : ''}">
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-name">${esc(r.name)}</span>
      <span class="lb-won">${r.games_won} ${t('winsShort')}</span>
      <span class="lb-played muted">${r.games_played} ${t('gamesShort')}</span>
    </div>`).join('');
}

$('#create-btn').onclick = () => sendMsg({ type: 'createTable', name: $('#table-name-input').value });
$('#join-code-btn').onclick = () => {
  const c = $('#join-code-input').value.trim().toUpperCase();
  if (c.length === 4) sendMsg({ type: 'joinTable', id: c });
  else toast(t('code4'));
};
$('#join-code-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#join-code-btn').click(); });

$('#start-btn').onclick = () => sendMsg({ type: 'startGame' });
$('#add-bot-btn').onclick = () => sendMsg({ type: 'addBot' });
$('#remove-bot-btn').onclick = () => sendMsg({ type: 'removeBot' });
$('#leave-btn').onclick = () => sendMsg({ type: 'leaveTable' });
$('#g-leave').onclick = () => {
  if (lastGame && lastGame.phase === 'playing') {
    const msg = lang === 'en' ? 'Leave the ongoing game? You will drop out of the match.' : 'Выйти из идущей игры? Вы выбудете из партии.';
    if (!confirm(msg)) return;
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
setInterval(() => { tickTimer(); tickResultsLock(); }, 250);

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
  for (const [freq, dt] of notes) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(audioCtx.destination);
    const s = now + dt;
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

// хлыст на даму пик — символ наказания (следующий берёт 5 и пропускает)
let lastTopId = null;
function playWhip() {
  if (!soundOn) return;
  ensureAudio();
  if (!audioCtx) return;
  const ctx = audioCtx, now = ctx.currentTime, dur = 0.28;
  // шумовой свист-щелчок с быстрым подъёмом и спадом частоты
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(500, now);
  bp.frequency.exponentialRampToValueAtTime(5500, now + 0.13); // свист вверх
  bp.frequency.exponentialRampToValueAtTime(900, now + dur);   // и вниз — «щёлк»
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.55, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(bp); bp.connect(g); g.connect(ctx.destination);
  src.start(now); src.stop(now + dur);
}
function maybePlayWhip(g) {
  const tid = g.top ? g.top.id : null;
  if (g.phase === 'playing' && tid === 'Q♠' && lastTopId !== 'Q♠') playWhip();
  lastTopId = tid;
}

function refreshSoundBtn() {
  const b = $('#g-sound');
  if (!b) return;
  b.textContent = soundOn ? '🔔' : '🔕';
  const on = lang === 'en' ? 'on' : 'вкл';
  const off = lang === 'en' ? 'off' : 'выкл';
  b.title = `${t('sound')}: ${soundOn ? on : off}`;
}
$('#g-sound').onclick = () => {
  soundOn = !soundOn;
  localStorage.setItem('g125_sound', soundOn ? 'on' : 'off');
  refreshSoundBtn();
  if (soundOn) playTurnChime(); // короткий предпросмотр
};
refreshSoundBtn();

// ---------- старт ----------

$('#lang-toggle').onclick = () => setLang(lang === 'ru' ? 'en' : 'ru');
applyStaticI18n();

const buildTag = $('#build-tag');
if (buildTag) buildTag.textContent = 'build ' + BUILD;
if (store.name) $('#name-input').value = store.name;
show('name');
connect();
