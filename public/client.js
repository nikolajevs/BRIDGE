'use strict';

/* Клиент игры «Бридж» */

const BUILD = 'seats-layout-2026-07-17';
console.log('Бридж client build:', BUILD);

// Ссылка для пожертвований (одна на все места, где она показывается)
const DONATE_URL = 'https://donationbox.lv/donation?campaign_title=BRIDGE.LAT%20Donations&detail=Ziedojums&iban=LV28HABA0551027967329&payee=Igors%20Nikolajevs&pp=bridgegame&rec=1&s1=1&s2=5&s3=10';

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
    nextRoundIn: 'Следующий раунд через', starting: 'Начинаем…',
    gameOver: 'Партия окончена', winnerIs: 'Победитель —', rematch: 'Сыграть ещё',
    youWonTitle: '🏆 Поздравляем!', youWonLine: 'Вы выиграли партию!',
    playerCol: 'Игрок', scoreCol: 'Очки', roundsCol: 'Раунды',
    winnerNote: 'победитель', outNote: 'выбыл',
    rematchWait: 'Создатель стола может начать новую партию', leaveToLobby: 'Выйти в лобби',
    youDeal: 'вы раздаёте', youOut: 'вы выбыли', lastCard: 'последняя карта!',
    chatPh: 'Сообщение столу…', enterName: 'Введите имя', code4: 'Код стола — 4 символа',
    needLoginPass: 'Введите логин и пароль',
    refresh: 'Обновить', save: 'Сохранить', del: 'Удалить', newPass: 'Новый пароль',
    emptyKeep: 'оставить пустым', adminFlag: 'админ', backCabinet: '← В кабинет',
    reconnecting: 'Переподключение…',
    donate: '♥ Поддержать проект',
    rulesLink: 'Правила игры', rulesTitle: 'Правила игры', close: 'Закрыть',
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
    nextRoundIn: 'Next round in', starting: 'Starting…',
    gameOver: 'Game over', winnerIs: 'Winner —', rematch: 'Play again',
    youWonTitle: '🏆 Congratulations!', youWonLine: 'You won the game!',
    playerCol: 'Player', scoreCol: 'Score', roundsCol: 'Rounds',
    winnerNote: 'winner', outNote: 'out',
    rematchWait: 'The host can start a new game', leaveToLobby: 'Back to lobby',
    youDeal: 'you deal', youOut: 'you are out', lastCard: 'last card!',
    chatPh: 'Message to the table…', enterName: 'Enter a name', code4: 'Table code is 4 characters',
    needLoginPass: 'Enter login and password',
    refresh: 'Refresh', save: 'Save', del: 'Delete', newPass: 'New password',
    emptyKeep: 'leave empty', adminFlag: 'admin', backCabinet: '← To profile',
    reconnecting: 'Reconnecting…',
    donate: '♥ Support the project',
    rulesLink: 'Game rules', rulesTitle: 'Game rules', close: 'Close',
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
  const rm = $('#rules-modal');
  if (rm && !rm.classList.contains('hidden')) $('#rules-body').innerHTML = RULES_HTML[lang];
  if (lastGame) renderGame(lastGame);
  if (lastLobby) renderLobby(lastLobby);
}

// Текст правил для всплывающего окна (свой доверенный HTML, вставляется как innerHTML)
const RULES_HTML = {
  ru: `
    <h4>Основное</h4>
    <ul>
      <li>Колода 36 карт, от 2 до 6 игроков. Раздача: всем по 5 карт, дилеру 4 — его пятая карта уходит вслепую первой на стол. Ходят по часовой стрелке.</li>
      <li><b>Ход:</b> карта <b>той же масти</b> (любого достоинства) либо карта <b>того же достоинства</b> любой масти.</li>
      <li>Нечем ходить — берёшь карту из прикупа. После добора можно сыграть любую подходящую карту или спасовать.</li>
      <li>Прикуп кончился — сброс тасуется заново.</li>
      <li>На ход даётся <b>30 секунд</b>. Не успел — за тебя берётся карта из прикупа и ход пасуется.</li>
    </ul>

    <h4>Особые карты</h4>
    <table class="rules-cards">
      <tr><td class="rc">6</td><td>Ходом нельзя закончить — накрой её сам (та же масть, девятка или валет). Другая шестёрка меняет масть, но ход не закрывает. Нечем накрыть — тяни из прикупа.</td></tr>
      <tr><td class="rc">7</td><td>Следующий берёт 1 карту и ходит.</td></tr>
      <tr><td class="rc">8</td><td>Следующий берёт 2 карты и пропускает ход. Но если у него есть восьмёрка — обязан её положить: штраф растёт на +2 и переходит дальше. В цепочке восьмёрок девятка и валет не работают.</td></tr>
      <tr><td class="rc">9</td><td>Кладётся на любую карту. Девятку можно крыть девяткой. За ход — только одна.</td></tr>
      <tr><td class="rc">В</td><td>Кладётся на любую карту, игрок заказывает масть (если валет последняя карта, раунд на нём и кончается — масть не заказывается). Если раунд выигран валетом, очки проигравших умножаются: свой валет — ×2. Все свои валеты можно скинуть за один ход, если это последние карты: два — ×3, три — ×4. Валеты разных игроков не суммируются.</td></tr>
      <tr><td class="rc red">Д♠</td><td>Дама пик: следующий берёт 5 карт и пропускает ход.</td></tr>
      <tr><td class="rc">К</td><td>Четыре короля подряд — положивший четвёртого мгновенно выигрывает всю партию.</td></tr>
      <tr><td class="rc">Т</td><td>Следующий пропускает ход, отбиться нельзя. В игре 1×1 ход возвращается — тузы можно скидывать подряд.</td></tr>
    </table>

    <h4>Счёт</h4>
    <ul>
      <li>Раунд выигрывает тот, кто первым избавился от карт. Остальным начисляются очки за карты на руках: <b>6, 7, 8, 9 — 0</b>; <b>туз — 15</b>; <b>10, валет, дама, король — 10</b>.</li>
      <li>Пока счёт не открыт, раунд записывается только если набрано <b>30 и более</b> очков. Меньше — счёт не открывается. После открытия считаются все раунды подряд.</li>
      <li>Ровно <b>125</b> — счёт обнуляется (и снова закрывается). Больше 125 — игрок выбывает. Играют до последнего.</li>
    </ul>`,
  en: `
    <h4>Basics</h4>
    <ul>
      <li>36-card deck, 2 to 6 players. Deal: 5 cards each, 4 to the dealer — the dealer's fifth card goes face-up to the table first. Play proceeds clockwise.</li>
      <li><b>A move:</b> a card of the <b>same suit</b> (any rank) or a card of the <b>same rank</b> (any suit).</li>
      <li>Nothing to play — draw a card from the deck. After drawing you may play any matching card or pass.</li>
      <li>When the deck runs out, the discard pile is reshuffled.</li>
      <li>You get <b>30 seconds</b> per turn. Miss it and a card is drawn for you and the turn is passed.</li>
    </ul>

    <h4>Special cards</h4>
    <p class="rules-note">Cards show Russian letters: <b>В</b> = Jack, <b>Д</b> = Queen, <b>К</b> = King, <b>Т</b> = Ace.</p>
    <table class="rules-cards">
      <tr><td class="rc">6</td><td>You cannot end your turn on it — cover it yourself (same suit, a nine or a jack). Another six changes the suit but does not close the turn. Nothing to cover with — keep drawing.</td></tr>
      <tr><td class="rc">7</td><td>The next player draws 1 card and plays.</td></tr>
      <tr><td class="rc">8</td><td>The next player draws 2 cards and misses a turn. But if they hold an eight they must play it: the penalty grows by +2 and passes on. Nines and jacks do not work inside an eight chain.</td></tr>
      <tr><td class="rc">9</td><td>Plays on any card. A nine can be covered by a nine. Only one per turn.</td></tr>
      <tr><td class="rc">В</td><td>Jack: plays on any card, the player names a suit (if the jack is your last card the round ends on it, so no suit is named). Winning a round with a jack multiplies the losers' points: your own jack — ×2. You may dump all your jacks in one move if they are your last cards: two — ×3, three — ×4. Jacks from different players do not stack.</td></tr>
      <tr><td class="rc red">Д♠</td><td>Queen of spades: the next player draws 5 cards and misses a turn.</td></tr>
      <tr><td class="rc">К</td><td>Four kings in a row — whoever plays the fourth instantly wins the whole match.</td></tr>
      <tr><td class="rc">Т</td><td>Ace: the next player misses a turn, no defence. In a 1×1 game the turn returns — aces can be played one after another.</td></tr>
    </table>

    <h4>Scoring</h4>
    <ul>
      <li>The round goes to whoever runs out of cards first. Everyone else scores for the cards still in hand: <b>6, 7, 8, 9 — 0</b>; <b>ace — 15</b>; <b>10, jack, queen, king — 10</b>.</li>
      <li>Until your score is open, a round only counts if it is <b>30 or more</b> points. Less than that does not open your score. Once open, every round counts.</li>
      <li>Exactly <b>125</b> resets your score to zero (and closes it again). Over 125 — you are out. Play continues to the last player standing.</li>
    </ul>`,
};

// ---------- Telegram Mini App ----------
// Игра работает и как обычный сайт, и внутри Telegram. Здесь только то, что
// нужно внутри мессенджера: развернуть окно и войти без пароля.

const TG = (window.Telegram && window.Telegram.WebApp) || null;
// initData пустая, если страницу открыли не из Telegram, — тогда всё как обычно
const inTelegram = !!(TG && TG.initData);

function setupTelegram() {
  if (!TG) return;
  try {
    TG.ready();
    TG.expand();                                   // не оставаться в «шторке» на пол-экрана
    if (TG.disableVerticalSwipes) TG.disableVerticalSwipes(); // свайп по столу не должен закрывать игру
    if (TG.setHeaderColor) TG.setHeaderColor('#1A110D');
    if (TG.setBackgroundColor) TG.setBackgroundColor('#221713');
    // Высоту берём у Telegram: на iOS 100dvh внутри «шторки» врёт и низ обрезается.
    applyTgViewport();
    if (TG.onEvent) TG.onEvent('viewportChanged', applyTgViewport);
  } catch (e) {
    console.warn('Telegram WebApp:', e);
  }
}

function applyTgViewport() {
  const h = TG && (TG.viewportStableHeight || TG.viewportHeight);
  if (h) document.documentElement.style.setProperty('--app-h', h + 'px');
}

// Имя из профиля Telegram. Используется только как запасной вариант для входа
// гостем: доверять этим данным нельзя, они не подписаны (в отличие от initData).
function tgProfileName() {
  const u = TG && TG.initDataUnsafe && TG.initDataUnsafe.user;
  const n = u && (u.first_name || u.username);
  return String(n || 'Игрок').trim().slice(0, 20) || 'Игрок';
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
    // в Telegram входим по подписанным данным профиля — ни логина, ни пароля не нужно.
    // имя шлём запасным вариантом: если подпись не примут, зайдём хотя бы гостем
    else if (inTelegram) sendMsg({ type: 'hello', tgInitData: TG.initData, name: tgProfileName(), token: store.token });
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
      if (m.auth) store.auth = m.auth;   // сессия, выданная при входе через Telegram
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
    case 'lobby': {
      lastLobby = m;
      renderLobby(m);
      // пока игрок читает итоги партии — не уводим его с экрана игры,
      // иначе непонятно, чем всё кончилось. Список лобби всё равно обновлён.
      const overShown = currentScreen === 'game' && lastGame && lastGame.phase === 'over';
      if (!overShown) show('lobby');
      break;
    }
    case 'table': {
      renderTable(m);
      // пока игрок читает итоги партии — не уводим его с экрана игры;
      // он сам решит: «Сыграть ещё» или «Выйти в лобби»
      const showingOver = currentScreen === 'game' && lastGame && lastGame.phase === 'over';
      if (!m.inGame && !showingOver) { chatLines = []; show('table'); }
      break;
    }
    case 'game':
      lastGame = m;
      updateTurnDeadline(m);
      armResultsLock(m);
      maybePlayTurnSound(m);
      maybePlayCardSfx(m);
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
// Небольшой наклон карты в сбросе. Считается от id, а не случайно — иначе
// стопка дёргалась бы при каждой перерисовке состояния.
function cardTilt(c) {
  let h = 0;
  for (let i = 0; i < c.id.length; i++) h = (h * 31 + c.id.charCodeAt(i)) & 0xffff;
  return (h % 9) - 4;   // −4…+4 градуса
}

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

  // Соперники сидят по очереди хода (по часовой): первый после меня — левее,
  // последний передо мной — правее. Раскладки заданы явно под каждое число
  // игроков — так предсказуемо и никто не наезжает на мою руку и на борта.
  const opp = $('#opponents');
  const ptsLbl = lang === 'en' ? 'pts' : 'очк.';
  const meIdx = g.youIdx;
  const total = g.players.length;
  const others = [];
  for (let step = 1; step < total; step++) {
    const idx = (meIdx + step) % total;
    others.push({ p: g.players[idx], i: idx });
  }

  // позиции по числу соперников: {x,y} в % от стола; крайних якорим к борту.
  // 1 соперник — сверху по центру; 2 и больше — дугой сверху.
  const LAYOUTS = {
    1: [{ x: 50, y: 8 }],
    2: [{ x: 22, y: 14 }, { x: 78, y: 14 }],
    3: [{ x: 14, y: 30 }, { x: 50, y: 6 }, { x: 86, y: 30 }],
    4: [{ x: 12, y: 40 }, { x: 34, y: 8 }, { x: 66, y: 8 }, { x: 88, y: 40 }],
    5: [{ x: 10, y: 44 }, { x: 28, y: 12 }, { x: 50, y: 4 }, { x: 72, y: 12 }, { x: 90, y: 44 }],
  };
  const layout = LAYOUTS[others.length] || LAYOUTS[5];

  opp.innerHTML = others.map((x, k) => {
    const { p, i } = x;
    const cls = [
      'opp',
      i === g.turnIdx ? 'turn' : '',
      p.eliminated ? 'out' : '',
      p.connected ? '' : 'offline',
      (p.count === 1 && !p.eliminated) ? 'one-card' : '',
    ].join(' ');

    // до 5 рубашек, остальное — числом; так карточка компактнее
    const shown = Math.min(p.count, 5);
    let minis = '';
    for (let s = 0; s < shown; s++) minis += '<div class="mini"></div>';
    let countTag = '';
    if (p.count > 5) countTag = `<span class="more">${p.count}</span>`;
    else if (p.count === 0 && !p.eliminated) minis = '<span class="more">—</span>';

    const score = p.eliminated ? (lang === 'en' ? 'out' : 'выбыл') : `${p.score} ${ptsLbl}`;

    const pos = layout[k];
    // к борту прижимаем только внешние карточки; ближе к центру — центрируем по точке
    const side = pos.x <= 15 ? 'anchor-l' : pos.x >= 85 ? 'anchor-r' : '';
    const posStyle = side === 'anchor-r'
      ? `right:${(100 - pos.x).toFixed(1)}%;top:${pos.y}%`
      : `left:${pos.x.toFixed(1)}%;top:${pos.y}%`;

    return `<div class="${cls} ${side}" style="${posStyle}">
      <div class="opp-name">${i === g.dealerIdx ? '<span class="dealer">◈</span> ' : ''}${esc(p.name)}</div>
      <div class="opp-cards">${minis}${countTag}</div>
      <div class="opp-score">${score}</div>
    </div>`;
  }).join('');

  // центр стола: показываем последние три карты сброса — веером от центра,
  // чтобы у нижних были видны масть и достоинство, а верхняя читалась как верхняя
  $('#deck-count').textContent = g.deckCount;
  const disc = $('#discard-pile');
  const pile = (g.topCards && g.topCards.length) ? g.topCards : (g.top ? [g.top] : []);
  disc.innerHTML = pile.map(c => cardHTML(c)).join('');
  const n = pile.length;
  [...disc.children].forEach((el, i) => {
    const off = i - (n - 1) / 2;          // одна карта остаётся ровно по центру
    el.style.transform =
      `translate(calc(var(--dx) * ${off}), calc(var(--dy) * ${off})) rotate(${cardTilt(pile[i])}deg)`;
    el.style.zIndex = String(i + 1);      // новее — выше
    el.classList.toggle('under', i < n - 1);
  });

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
      // валет последней картой заканчивает раунд — заказывать масть не для кого
      if (card && card.r === 'J' && g.hand.length > 1) openSuitModal(id);
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
  if (lastGame.phase === 'roundEnd') {
    const el = $('#next-round-wait');
    el.textContent = secs > 0 ? `${t('nextRoundIn')} ${secs}…` : t('starting');
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
    rm.classList.remove('hidden');
  } else {
    rm.classList.add('hidden');
  }

  // конец партии
  const om = $('#over-modal');
  if (g.phase === 'over') {
    $('#over-title').textContent = g.youWon ? t('youWonTitle') : t('gameOver');
    $('#over-title').classList.toggle('win', !!g.youWon);
    $('#winner-line').innerHTML = g.youWon
      ? t('youWonLine')
      : `${t('winnerIs')} <b>${esc(g.winner || '')}</b>`;
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
// Нужен только когда после валета игра продолжается: если валет последняя
// карта (или скидываются все валеты), раунд заканчивается и масть не заказывается.

let suitCardId = null;
function openSuitModal(cardId) {
  suitCardId = cardId;
  $('#suit-modal').classList.remove('hidden');
}
document.querySelectorAll('.suit-btn').forEach(b => {
  b.onclick = () => {
    $('#suit-modal').classList.add('hidden');
    if (suitCardId) sendMsg({ type: 'playCard', cardId: suitCardId, suit: b.dataset.suit });
    suitCardId = null;
  };
});
$('#suit-cancel').onclick = () => {
  suitCardId = null;
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
$('#dump-jacks-btn').onclick = () => sendMsg({ type: 'dumpJacks' });
$('#pass-btn').onclick = () => sendMsg({ type: 'endTurn' });
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

// Звуковые эффекты карт. Файл грузится один раз и переиспользуется.
const SFX = {};
function playSfx(name) {
  if (!soundOn) return;
  let a = SFX[name];
  if (!a) {
    a = SFX[name] = new Audio('sounds/' + name + '.mp3');
    a.preload = 'auto';
    a.volume = 0.85;
  }
  a.currentTime = 0;
  // play() отклоняется, пока на странице не было действий пользователя — это не ошибка
  a.play().catch(() => {});
}

// Звук играем, когда на стол легла НОВАЯ карта: даму пик ловим по конкретной
// карте, семёрку — по достоинству (их в колоде четыре).
let lastTopId = null;
function maybePlayCardSfx(g) {
  const top = (g.phase === 'playing' && g.top) ? g.top : null;
  const tid = top ? top.id : null;
  if (tid && tid !== lastTopId) {
    if (tid === 'Q♠') playSfx('dama-pik');
    else if (top.r === '7') playSfx('7');
    else if (top.r === '8') playSfx('8');
  }
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
document.querySelectorAll('.donate-link').forEach(a => { a.href = DONATE_URL; });

// ---------- окно с правилами ----------

function openRules() {
  $('#rules-body').innerHTML = RULES_HTML[lang] || RULES_HTML.ru;
  $('#rules-modal').classList.remove('hidden');
}
function closeRules() { $('#rules-modal').classList.add('hidden'); }

$('#rules-link').onclick = (e) => { e.preventDefault(); openRules(); };
$('#rules-close').onclick = closeRules;
// клик по затемнению и Esc — тоже закрывают
$('#rules-modal').onclick = (e) => { if (e.target === $('#rules-modal')) closeRules(); };
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#rules-modal').classList.contains('hidden')) closeRules();
});

const buildTag = $('#build-tag');
if (buildTag) buildTag.textContent = 'build ' + BUILD;
if (store.name) $('#name-input').value = store.name;

setupTelegram();
if (inTelegram) {
  // личность приходит из Telegram — уводить себя в гостя нечего
  const ch = $('#change-name');
  if (ch) ch.classList.add('hidden');
}

show('name');
connect();
