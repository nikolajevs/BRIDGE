# Авто-деплой на VPS (Ubuntu 24)

Схема: `git push` в `main` → GitHub Actions заходит на сервер по SSH →
`git pull` + `npm ci` + перезапуск systemd-сервиса.

Приложение работает как **user-сервис** systemd (без root), с автозапуском
при загрузке и авторестартом при падении. Репозиторий публичный — на сервере
для `git pull` токен не нужен.

---

## 1. Одноразовая настройка сервера

Выполнять на VPS под обычным пользователем (не root), например `deploy` или свой.

### 1.1. Node.js и git

```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v      # должно быть v20.x
```

### 1.2. Клонировать репозиторий в домашнюю папку

```bash
cd ~
git clone https://github.com/nikolajevs/BRIDGE.git
cd BRIDGE
npm ci
```

### 1.3. systemd user-сервис

```bash
mkdir -p ~/.config/systemd/user
cp ~/BRIDGE/deploy/game125.service ~/.config/systemd/user/game125.service

# чтобы сервис работал без активной SSH-сессии и стартовал после ребута
loginctl enable-linger "$USER"

systemctl --user daemon-reload
systemctl --user enable --now game125
systemctl --user status game125 --no-pager   # должно быть active (running)
```

Порт по умолчанию 3000. Поменять — отредактировать `Environment=PORT=...`
в `~/.config/systemd/user/game125.service`, затем
`systemctl --user daemon-reload && systemctl --user restart game125`.

### 1.4. Открыть порт (если включён ufw)

```bash
sudo ufw allow 3000/tcp     # либо 80/443, если поставите nginx (см. ниже)
```

Проверка: открыть `http://IP_СЕРВЕРА:3000` в браузере.

---

## 2. SSH-ключ для GitHub Actions

Actions должен заходить на сервер. Заведём **отдельный** ключ только для деплоя.

На VPS:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gh_deploy -N "" -C "github-actions"
cat ~/.ssh/gh_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo "----- ПРИВАТНЫЙ КЛЮЧ (скопировать целиком в секрет VPS_SSH_KEY) -----"
cat ~/.ssh/gh_deploy
```

Приватный ключ (`gh_deploy`, весь блок вместе со строками
`-----BEGIN/END OPENSSH PRIVATE KEY-----`) пойдёт в секрет GitHub.

---

## 3. Секреты в GitHub

Репозиторий → **Settings → Secrets and variables → Actions → New repository secret**.
Добавить четыре:

| Имя | Значение |
|---|---|
| `VPS_HOST` | IP или домен сервера |
| `VPS_USER` | пользователь на сервере (тот, под кем настраивали) |
| `VPS_PORT` | порт SSH (обычно `22`) |
| `VPS_SSH_KEY` | приватный ключ `gh_deploy` целиком |

---

## 4. Готово

Файл `.github/workflows/deploy.yml` уже в репозитории. Теперь любой push
в `main` автоматически выкатывается на сервер. Прогресс и логи каждого
деплоя видны во вкладке **Actions**. Там же кнопка **Run workflow** —
запустить деплой вручную, ничего не коммитя.

Проверить весь путь: сделать любой коммит в `main` и посмотреть Actions →
последний запуск должен закончиться строкой `Deployed <хеш>`.

---

## База данных

Аккаунты, статистика и топ-100 хранятся в SQLite-файле (`better-sqlite3`).
По умолчанию база лежит в `data/bridge.db` рядом с приложением; путь можно
переопределить переменной `DB_PATH`. Папка `data/` не в git и переживает
деплой (`git reset --hard` не трогает неотслеживаемые файлы). Бэкап — просто
копия файла `data/bridge.db` (плюс `-wal`/`-shm`, если есть).

`better-sqlite3` при `npm ci` обычно ставит готовый бинарник — компиляция не
нужна. Если готового бинарника не окажется и установка попросит сборку,
поставь инструменты: `sudo apt install -y build-essential python3`.

### Администратор

Управление аккаунтами (изменить/удалить) доступно только админу. Назначить
себя админом: задать переменную `ADMIN_LOGIN` со своим логином в сервисе.
В `~/.config/systemd/user/game125.service` в секцию `[Service]` добавить строку

```
Environment=ADMIN_LOGIN=твой_логин
```

затем `systemctl --user daemon-reload && systemctl --user restart game125`.
При старте этот аккаунт получает права админа (флаг `is_admin` в БД). После
входа под ним в личном кабинете появится кнопка «Управление аккаунтами».

## Полезные команды на сервере

```bash
systemctl --user status game125          # состояние
journalctl --user -u game125 -f          # живые логи
systemctl --user restart game125         # ручной перезапуск
```

---

## (Необязательно) Домен и HTTPS через nginx

Чтобы отдавать игру на 80/443 с сертификатом, поставить nginx как обратный
прокси. Важно: WebSocket требует проброса заголовков Upgrade.

```nginx
server {
    server_name game.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Затем `sudo certbot --nginx -d game.example.com` для бесплатного сертификата
Let's Encrypt. Клиент сам определит `wss://`, отдельная настройка не нужна.
