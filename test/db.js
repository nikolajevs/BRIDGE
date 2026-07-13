'use strict';

// Тесты слоя БД. Используем временный файл, чтобы не трогать боевую базу.
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = path.join(os.tmpdir(), 'bridge-test-' + Date.now() + '.db');
process.env.DB_PATH = tmp;

const db = require('../server/db');
const assert = require('assert');

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1; }
}

console.log('База данных:');

ok('регистрация создаёт пользователя', () => {
  const u = db.register('Igors', 'secret123', 'Игорь');
  assert(u.id > 0);
  assert.strictEqual(u.login, 'Igors');
  assert.strictEqual(u.name, 'Игорь');
});

ok('повторный логин (регистронезависимо) запрещён', () => {
  let threw = false;
  try { db.register('igors', 'other123', 'Другой'); } catch { threw = true; }
  assert(threw);
});

ok('короткий пароль отклоняется', () => {
  let threw = false;
  try { db.register('shorty', '123', 'X'); } catch { threw = true; }
  assert(threw);
});

ok('неверный логин отклоняется', () => {
  let threw = false;
  try { db.register('a b', 'secret123', 'X'); } catch { threw = true; }
  assert(threw);
});

ok('вход с верным паролем', () => {
  const u = db.login('igors', 'secret123');
  assert.strictEqual(u.login, 'Igors');
});

ok('вход с неверным паролем — ошибка', () => {
  let threw = false;
  try { db.login('igors', 'wrong'); } catch { threw = true; }
  assert(threw);
});

ok('сессия резолвится в пользователя', () => {
  const u = db.login('igors', 'secret123');
  const tok = db.createSession(u.id);
  const back = db.userBySession(tok);
  assert.strictEqual(back.id, u.id);
  db.deleteSession(tok);
  assert.strictEqual(db.userBySession(tok), null);
});

ok('запись партии обновляет статистику', () => {
  const a = db.register('Alice', 'secret123', 'Alice');
  const b = db.register('Bob', 'secret123', 'Bob');
  db.recordGame([a.id, b.id], a.id, { [a.id]: 3, [b.id]: 1 });
  const sa = db.userStats(a.id);
  const sb = db.userStats(b.id);
  assert.strictEqual(sa.gamesPlayed, 1);
  assert.strictEqual(sa.gamesWon, 1);
  assert.strictEqual(sa.roundsWon, 3);
  assert.strictEqual(sb.gamesPlayed, 1);
  assert.strictEqual(sb.gamesWon, 0);
  assert.strictEqual(sb.roundsWon, 1);
  assert.strictEqual(sa.winrate, 100);
});

ok('топ-100 сортируется по победам', () => {
  // Alice уже с 1 победой, добавим ещё
  const a = db.login('Alice', 'secret123');
  db.recordGame([a.id], a.id, {});
  const lb = db.leaderboard(100);
  assert(lb.length >= 2);
  assert.strictEqual(lb[0].name, 'Alice');   // 2 победы — первая
  assert(lb[0].games_won >= lb[1].games_won); // отсортировано по убыванию
});

ok('ранг игрока считается верно', () => {
  const a = db.login('Alice', 'secret123');
  assert.strictEqual(db.userStats(a.id).rank, 1);
});

console.log(passed + ' проверок БД пройдено' + (process.exitCode ? ', есть ошибки!' : '.'));

// уборка
try { fs.unlinkSync(tmp); fs.unlinkSync(tmp + '-wal'); fs.unlinkSync(tmp + '-shm'); } catch {}
