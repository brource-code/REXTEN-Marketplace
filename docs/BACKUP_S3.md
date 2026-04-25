# Бэкапы платформы (только AWS S3)

Архив собирается **во временной папке** внутри контейнера, затем **целиком загружается в S3**; постоянной копии на диске backend **нет** (кроме кратковременного файла на время загрузки).

## Что входит в архив

Один файл `rexten-backup-YYYY-MM-DD-HHMMSS.tar.gz`:

| Содержимое | Описание |
|------------|----------|
| `data/db.sql.gz` | Дамп PostgreSQL (`pg_dump`) |
| `config/backend.env` | Копия `backend/.env` |
| `config/frontend.env.local` | Копия `frontend/.env.local` (если есть) |
| `project.tar.gz` | Код репозитория (см. исключения ниже — без тяжёлых артефактов) |
| `docker-images.tar` | Только если `BACKUP_DOCKER_ENABLED=true` — `docker save` образов (очень долго и тяжело) |
| `manifest.json` | Метаданные |
| `RESTORE.sh` | Скрипт восстановления на новом сервере |

### Что не попадает в `project.tar.gz` (ускорение бэкапа)

Список задаётся в `backend/config/backups.php` → `project_exclude`. Среди прочего исключаются:

- **`node_modules`**, **`vendor`**, **`.next`**, **`.git`**, **`.cursor`**
- **`ecme-admin.zip`** в корне репозитория (часто **~2 ГБ**)
- **`frontend/rexten-*`** — старые снимки/архивы шаблона REXTEN
- **`backend/storage/app/backups`**, логи, кеш/сессии/views во `storage/framework`

Загруженные файлы пользователей остаются в **`backend/storage/app/public`** (если нужны — не исключаем).

## Обязательные переменные `backend/.env`

**Регион:** `AWS_DEFAULT_REGION` должен **совпадать с регионом bucket** (в консоли S3: свойства bucket → Region). Пример: bucket в **US West (N. California)** → `AWS_DEFAULT_REGION=us-west-1`.

**Секреты** никогда не коммитьте и не отправляйте в чаты — при утечке сразу удалите access key в IAM и создайте новый.

```env
BACKUP_S3_ENABLED=true
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-west-1
BACKUP_S3_BUCKET=your-bucket-name
BACKUP_S3_PREFIX=platform-backups
```

Опционально:

```env
BACKUP_S3_KEEP=30
# Образы Docker в архив (по умолчанию в коде выключено — быстрый бэкап без гигабайт)
BACKUP_DOCKER_ENABLED=false
```

По умолчанию **`BACKUP_DOCKER_ENABLED` не задан** → образы **не** сохраняются (быстрый бэкап). Включайте `true` только если нужен офлайн-восстановление тех же образов на новом сервере.

Сколько **последних успешных** бэкапов оставлять в S3 (старые объекты и записи в БД удаляются). `0` — не удалять автоматически.

Пока `BACKUP_S3_ENABLED=false` или не заданы bucket/ключи — **создать бэкап нельзя** (API вернёт 503 с текстом ошибки).

## Bucket и IAM

1. Создайте отдельный bucket (например `rexten-backups`).
2. IAM-пользователь или роль с правами: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket` на этот bucket.
3. В консоли AWS проверьте регион bucket — он должен совпадать с `AWS_DEFAULT_REGION`.

### Ошибка `SignatureDoesNotMatch` в логах

Значит **неверная пара ключей** или секрет испорчен при копировании:

- В `.env` **без кавычек** вокруг секрета (или кавычки целиком, без «умных» кавычек).
- **Secret Access Key** — ровно **40 символов**, без `/` или пробела в начале/конце (частая ошибка при копировании из AWS).
- После правок: `docker exec rexten_backend php artisan config:clear` и перезапуск `rexten_queue`.
- Проверка: в IAM создайте **новый** access key, вставьте заново, старый удалите.

Если раньше в интерфейсе бэкап был «успешен», а в S3 пусто — старые версии могли не бросать исключение при ошибке S3; сейчас диск `s3_backup` с `throw=true` и при неверных ключах бэкап завершится с **ошибкой**, а не ложным успехом.

## Самопроверка загрузки (тот же механизм, что и бэкап)

Маленький файл загружается **тем же путём**, что и полный архив: поток из файла → `PutObject` → проверка `exists` → совпадение размера.

```bash
docker exec rexten_backend php artisan platform:backup-test-s3
```

По умолчанию тестовый объект после проверки **удаляется** из S3. Чтобы оставить файл в bucket и увидеть его в консоли AWS:

```bash
docker exec rexten_backend php artisan platform:backup-test-s3 --keep
```

## Очередь (важно)

Сборка и загрузка выполняются **воркером** (`rexten_queue`: `php artisan queue:work --queue=backups,default ...`), HTTP-запрос только ставит задачу в очередь.

- `QUEUE_CONNECTION=database` в `docker-compose` для сервисов `backend`, `queue`, `scheduler`.
- В `backend/.env` не используйте `QUEUE_CONNECTION=sync` в проде.

## Расписание (2 раза в день)

Контейнер **`scheduler`** (`php artisan schedule:work`) запускает `platform:backup --scheduled` в **06:00** и **18:00** (время контейнера), **только если** S3 уже настроен (`isS3Ready()`). Иначе задача не регистрируется.

Отключить только автобэкапы: `BACKUP_SCHEDULE_ENABLED=false`.

## Скачивание в UI

Список бэкапов хранится в БД (`platform_backups`). Кнопка «Скачать» запрашивает **временную presigned URL** (`GET /api/admin/backups/{id}/download-url`) и открывает её в новой вкладке — браузер качает файл **напрямую из S3**, без прокси через PHP и без загрузки всего файла в память браузера.

## Зависшие записи

Если воркер не работает, записи в статусах `queued` / `processing` старше порога помечаются как `failed` (см. `BACKUP_STALE_*` в `config/backups.php`).

## Восстановление на новом сервере

1. Скачайте `.tar.gz` из S3 (консоль AWS или CLI `aws s3 cp`).
2. Следуйте `RESTORE.sh` внутри архива и `docs/BACKUP_S3.md` (разделы про Docker/PostgreSQL в вашем проекте).

## Безопасность

- Ключи AWS только в `.env`, не коммитьте.
- Presigned URL действует ограниченное время (например 60 минут), выдаётся только суперадмину по JWT.
