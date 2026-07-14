'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');

// Файл БД вне рабочего дерева репозитория (переживает git reset --hard при деплое).
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'bridge.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  login         TEXT UNIQUE NOT NULL,
  login_lc      TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  pass_hash     TEXT NOT NULL,
  pass_salt     TEXT NOT NULL,
  games_played  INTEGER NOT NULL DEFAULT 0,
  games_won     INTEGER NOT NULL DEFAULT 0,
  rounds_won    INTEGER NOT NULL DEFAULT 0,
  is_admin      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_users_won ON users(games_won DESC, games_played ASC);
`);

// миграция: добавить is_admin, если база создана до этой колонки
const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!cols.includes('is_admin')) {
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
}

// назначить админа по переменной окружения ADMIN_LOGIN (один раз при старте)
const ADMIN_LOGIN = (process.env.ADMIN_LOGIN || '').trim().toLowerCase();
if (ADMIN_LOGIN) {
  db.prepare('UPDATE users SET is_admin = 1 WHERE login_lc = ?').run(ADMIN_LOGIN);
}

function isAdmin(user) {
  if (!user) return false;
  return user.is_admin === 1 || (ADMIN_LOGIN && user.login_lc === ADMIN_LOGIN);
}

// ---------- пароли (scrypt) ----------

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}
function verifyPassword(password, salt, expectedHash) {
  const h = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(h, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- пользователи ----------

const LOGIN_RE = /^[A-Za-z0-9_.-]{3,20}$/;

function register(login, password, name) {
  login = String(login || '').trim();
  name = String(name || '').trim().slice(0, 20) || login;
  if (!LOGIN_RE.test(login)) {
    throw new Error('Логин: 3–20 символов, латиница/цифры/._-');
  }
  if (String(password || '').length < 6) {
    throw new Error('Пароль минимум 6 символов');
  }
  const lc = login.toLowerCase();
  const exists = db.prepare('SELECT 1 FROM users WHERE login_lc = ?').get(lc);
  if (exists) throw new Error('Такой логин уже занят');
  const { hash, salt } = hashPassword(password);
  const info = db.prepare(`
    INSERT INTO users (login, login_lc, name, pass_hash, pass_salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`
  ).run(login, lc, name, hash, salt, Date.now());
  return getUserById(info.lastInsertRowid);
}

function login(loginName, password) {
  const lc = String(loginName || '').trim().toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE login_lc = ?').get(lc);
  if (!u || !verifyPassword(password, u.pass_salt, u.pass_hash)) {
    throw new Error('Неверный логин или пароль');
  }
  return u;
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ---------- сессии ----------

function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, userId, Date.now());
  return token;
}
function userBySession(token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).get(token);
  return row || null;
}
function deleteSession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ---------- статистика ----------

// Записать итог партии: played += 1 всем участникам-аккаунтам, won += 1 победителю.
const bumpPlayed = db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?');
const bumpWon = db.prepare('UPDATE users SET games_won = games_won + 1 WHERE id = ?');
const bumpRounds = db.prepare('UPDATE users SET rounds_won = rounds_won + ? WHERE id = ?');

const recordGame = db.transaction((participantIds, winnerId, roundsWonById) => {
  for (const id of participantIds) {
    bumpPlayed.run(id);
    const rw = roundsWonById && roundsWonById[id];
    if (rw) bumpRounds.run(rw, id);
  }
  if (winnerId) bumpWon.run(winnerId);
});

function leaderboard(limit = 100) {
  return db.prepare(`
    SELECT name, games_won, games_played, rounds_won
    FROM users
    ORDER BY games_won DESC, games_played ASC, id ASC
    LIMIT ?`
  ).all(limit);
}

function userStats(id) {
  const u = getUserById(id);
  if (!u) return null;
  // ранг по числу побед (1 + сколько игроков строго выше)
  const better = db.prepare(
    'SELECT COUNT(*) AS c FROM users WHERE games_won > ?'
  ).get(u.games_won).c;
  return {
    login: u.login,
    name: u.name,
    gamesPlayed: u.games_played,
    gamesWon: u.games_won,
    roundsWon: u.rounds_won,
    winrate: u.games_played ? Math.round((u.games_won / u.games_played) * 100) : 0,
    rank: better + 1,
    isAdmin: isAdmin(u),
  };
}

// ---------- админ ----------

function listUsers() {
  return db.prepare(`
    SELECT id, login, name, games_played, games_won, rounds_won, is_admin, created_at
    FROM users ORDER BY id ASC`
  ).all().map(u => ({
    id: u.id, login: u.login, name: u.name,
    gamesPlayed: u.games_played, gamesWon: u.games_won, roundsWon: u.rounds_won,
    isAdmin: u.is_admin === 1 || (ADMIN_LOGIN && u.login.toLowerCase() === ADMIN_LOGIN),
    createdAt: u.created_at,
  }));
}

function updateUser(id, fields) {
  const u = getUserById(id);
  if (!u) throw new Error('Пользователь не найден');

  const sets = [];
  const args = [];

  if (fields.name !== undefined) {
    const name = String(fields.name).trim().slice(0, 20);
    if (!name) throw new Error('Имя не может быть пустым');
    sets.push('name = ?'); args.push(name);
  }
  if (fields.login !== undefined) {
    const login = String(fields.login).trim();
    if (!LOGIN_RE.test(login)) throw new Error('Логин: 3–20 символов, латиница/цифры/._-');
    const lc = login.toLowerCase();
    const clash = db.prepare('SELECT id FROM users WHERE login_lc = ? AND id <> ?').get(lc, id);
    if (clash) throw new Error('Такой логин уже занят');
    sets.push('login = ?', 'login_lc = ?'); args.push(login, lc);
  }
  if (fields.password) {
    if (String(fields.password).length < 6) throw new Error('Пароль минимум 6 символов');
    const { hash, salt } = hashPassword(fields.password);
    sets.push('pass_hash = ?', 'pass_salt = ?'); args.push(hash, salt);
  }
  if (fields.isAdmin !== undefined) {
    sets.push('is_admin = ?'); args.push(fields.isAdmin ? 1 : 0);
  }
  if (!sets.length) return getUserById(id);
  args.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  return getUserById(id);
}

const deleteUser = db.transaction((id) => {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
});

module.exports = {
  register, login, getUserById,
  createSession, userBySession, deleteSession,
  recordGame, leaderboard, userStats,
  isAdmin, listUsers, updateUser, deleteUser,
};
