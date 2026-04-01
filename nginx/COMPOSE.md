# Nginx + PHP-FPM и Docker Compose

## Почему лучше Compose v2

Старый `docker-compose` 1.29.x с новым Docker API иногда падает с `KeyError: 'ContainerConfig'` при пересоздании контейнеров с томами.

**Рекомендация:** использовать плагин **Docker Compose V2**:

```bash
docker compose version
docker compose up -d --build
```

Если команда `docker compose` недоступна — [установите plugin](https://docs.docker.com/compose/install/linux/) или обновите Docker Engine.

## Логи Laravel в Docker

В `docker-compose.yml` для `backend`, `queue`, `scheduler` задано **`LOG_CHANNEL=stderr`**: логи идут в поток контейнера (`docker logs rexten_backend`), без записи в `storage/logs` на bind-mount. Права на `laravel.log` для работы API не нужны. Entrypoint по-прежнему выставляет владельца `storage` для загрузок и кэша.

## Ручной `docker run` для nginx

Временный обход при сбое compose: контейнер `rexten_nginx` можно поднять с теми же томами и сетью `rexten_rexten_network`. После перехода на `docker compose up` конфиг подхватится из `docker-compose.yml` автоматически.
