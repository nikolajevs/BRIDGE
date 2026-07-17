'use strict';

/**
 * Проверка подписи Telegram initData.
 *
 * Тесты писались после реального провала: Telegram включает поле `signature`
 * в расчёт hash, а мы его исключали. Синтетика проходила, живые пользователи —
 * нет. Поэтому здесь проверяются ОБА формата и обязательно попытки подделки:
 * ошибка в эту сторону отдаёт чужие аккаунты кому угодно.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN = '5768337691:AAH5YkoiEuPk8-FZa32hStHTqXiLPtAEhx8'; // токен из документации Telegram

// вытаскиваем функцию из сервера, не поднимая его целиком
function loadVerifier(token = TOKEN, maxAge = 86400) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
  const start = src.indexOf('function verifyTelegramInitData');
  assert(start > 0, 'verifyTelegramInitData не найдена в server/index.js');
  const body = src.slice(start, src.indexOf('\n}\n', start) + 3);
  return new Function('crypto', 'TG_BOT_TOKEN', 'TG_MAX_AGE_S', body + '; return verifyTelegramInitData;')(
    crypto, token, maxAge,
  );
}

// подписываем так же, как Telegram: hash считается по выбранным полям
function sign(fields, { skipSig = false, token = TOKEN } = {}) {
  const p = new URLSearchParams(fields);
  const dcs = [...p.entries()]
    .filter(([k]) => (skipSig ? k !== 'signature' : true))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  p.set('hash', crypto.createHmac('sha256', secret).update(dcs).digest('hex'));
  return p.toString();
}

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1; }
}

const verify = loadVerifier();
const now = () => Math.floor(Date.now() / 1000);
const USER = JSON.stringify({ id: 279058397, first_name: 'Владислав', username: 'vdkfrost' });
const SIG = 'zL-ucjNyREiHDE8aihFwpfR9aggP2xiAo3NSpfe-p7IbCisNlDKlo7Kb6G4D0Ao2mBrSgEk4maLSdv6MLIlADQ';

console.log('Подпись Telegram:');

ok('новый формат: signature участвует в hash', () => {
  const d = sign({ auth_date: now(), chat_type: 'private', user: USER, signature: SIG });
  assert.strictEqual(verify(d).id, 279058397);
});

ok('старый формат: signature вне hash', () => {
  const d = sign({ auth_date: now(), chat_type: 'private', user: USER, signature: SIG }, { skipSig: true });
  assert.strictEqual(verify(d).id, 279058397);
});

ok('initData без signature', () => {
  const d = sign({ auth_date: now(), query_id: 'AAH', user: USER });
  assert.strictEqual(verify(d).id, 279058397);
});

ok('имя со спецсимволами (+, /, ?)', () => {
  const u = JSON.stringify({ id: 42, first_name: 'Vladislav + - ? /' });
  const d = sign({ auth_date: now(), user: u, signature: SIG });
  assert.strictEqual(verify(d).id, 42);
});

ok('подделка: подпись чужим токеном', () => {
  const d = sign({ auth_date: now(), user: USER, signature: SIG }, { token: '111:WRONGTOKEN' });
  assert.strictEqual(verify(d), null);
});

ok('подделка: user подменён после подписи', () => {
  const d = sign({ auth_date: now(), user: USER, signature: SIG }).replace('279058397', '999999');
  assert.strictEqual(verify(d), null);
});

ok('подделка: выдуманный hash', () => {
  const d = 'auth_date=' + now() + '&user=' + encodeURIComponent(USER) + '&hash=deadbeef';
  assert.strictEqual(verify(d), null);
});

ok('подделка: hash отсутствует', () => {
  assert.strictEqual(verify('auth_date=' + now() + '&user=' + encodeURIComponent(USER)), null);
});

ok('просроченная подпись отклоняется', () => {
  const d = sign({ auth_date: now() - 2 * 86400, user: USER });
  assert.strictEqual(verify(d), null);
});

ok('без TG_BOT_TOKEN не доверяем никому', () => {
  const v = loadVerifier('');
  assert.strictEqual(v(sign({ auth_date: now(), user: USER })), null);
});

ok('мусор вместо initData', () => {
  for (const bad of ['', 'не-строка-запроса', 'hash=', '&&&']) {
    assert.strictEqual(verify(bad), null, 'принято: ' + JSON.stringify(bad));
  }
});

console.log(`${passed} проверок подписи пройдено.`);
