# Нагрузочные тесты API (k6)

## Установка k6

На этой машине k6 ставится в `~/.local/bin` (см. установку ниже). Проверка:

```bash
export PATH="$HOME/.local/bin:$PATH"
k6 version
```

Если команды нет — [официальная установка](https://grafana.com/docs/k6/latest/set-up/install-k6/) или скачайте архив с [релизов Grafana k6](https://github.com/grafana/k6/releases) (Linux amd64), распакуйте бинарник `k6` в `~/.local/bin` и сделайте исполняемым.

## Перед прогоном

1. Запущен backend (например Docker `rexten_backend`), API доступен с машины, где запускаете k6.
2. По умолчанию URL: **`http://127.0.0.1/api`** (nginx в Docker, порт 80). Для прямого PHP на хосте: `K6_API_URL=http://localhost:8000/api` и **`K6_NGINX_HOST=`** (пустое значение отключает заголовок `Host`).
3. Учётная запись с ролью `BUSINESS_OWNER` и привязанной компанией (см. тестовые пользователи в `.cursorrules`).

## Полный сценарий (~5 мин: разгон 1 мин + 500 VU 4 мин)

Из корня репозитория:

```bash
chmod +x loadtests/run-business-admin.sh
export PATH="$HOME/.local/bin:$PATH"
./loadtests/run-business-admin.sh
```

С явными переменными:

```bash
export PATH="$HOME/.local/bin:$PATH"
K6_API_URL=http://localhost:8000/api \
K6_EMAIL=business@ecme.com \
K6_PASSWORD=password123 \
./loadtests/run-business-admin.sh
```

Несколько аккаунтов (меньше конкуренции за одного пользователя в БД):

```bash
export PATH="$HOME/.local/bin:$PATH"
K6_ACCOUNTS_FILE=/abs/path/accounts.json ./loadtests/run-business-admin.sh
```

Формат `accounts.json`: `[{"email":"a@b.com","password":"secret"}, ...]`

Параметры длительности и пика (опционально):

- `K6_RAMP_DURATION` — разгон (по умолчанию `1m`)
- `K6_HOLD_DURATION` — удержание на пике (по умолчанию `4m`)
- `K6_PEAK_VUS` — целевое число VU (по умолчанию `500`)

## Быстрый smoke (проверка, что API отвечает)

Флаги k6 переопределяют сценарий в скрипте — короткий прогон без 500 пользователей:

```bash
export PATH="$HOME/.local/bin:$PATH"
./loadtests/run-business-admin.sh --vus 3 --duration 20s
```

Ожидается: в конце отчёт k6, низкий или нулевой `http_req_failed`, статусы 200 на защищённых маршрутах.

Перед прогоном поднимите backend (например `docker ps` и проброс порта `8000`). Если API недоступен, тест завершится с ошибкой порогов (код выхода **99**) — это нормально для «мёртвого» API.

Проверить только доступность без падения по `thresholds`:

```bash
./loadtests/run-business-admin.sh --no-thresholds --vus 2 --duration 10s
```

Постоянно добавлять `k6` в PATH (один раз в сессии или в `~/.bashrc`):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Отчёт и артефакты

- В консоли: сводка RPS, latency (p95), ошибки, пороги (`thresholds`).
- HTML-отчёт (нужен модуль `k6-html-reporter` или встроенный вывод): для простоты сохраняйте вывод в файл: `./loadtests/run-business-admin.sh 2>&1 | tee k6-report.txt`

## Что смотреть при анализе

- Рост `http_req_failed` и коды 5xx/502 от nginx/PHP-FPM.
- `http_req_duration` p95/p99 — узкое место API или БД.
- На сервере: CPU/RAM контейнера `rexten_backend`, соединения PostgreSQL, очереди.
