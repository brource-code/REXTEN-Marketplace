# SSH / SFTP через уже установленный Cloudflare Tunnel

Цель: зайти на домашний сервер по **SSH** и **SFTP (FileZilla)** с ноутбука из интернета, **без открытия порта 22** наружу на роутере.

Ниже — сценарий **«SSH with client-side cloudflared»** из [документации Cloudflare](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-cloudflared-authentication/): на сервере уже есть `cloudflared`, добавляем маршрут на локальный `sshd` и на клиенте ставим `cloudflared` + запись в `~/.ssh/config`.

---

## Что должно быть

- Аккаунт **Cloudflare Zero Trust** (бесплатный план подходит): [one.dash.cloudflare.com](https://one.dash.cloudflare.com).
- Туннель уже создан и работает (как для `rexten.live`).
- На **той же машине**, где крутится туннель (обычно хост, не внутри контейнера), слушает **sshd** порт **22** (или другой — тогда подставь свой порт везде ниже).

Проверка на сервере:

```bash
sudo ss -tlnp | grep ':22 '
# или
sudo systemctl status ssh
```

Если SSH только внутри Docker — сначала настрой выход на хост (проще: `sshd` на хосте, проект в Docker как сейчас).

---

## Шаг 1. Публичное имя в туннеле (SSH → localhost)

1. Зайди: **Zero Trust** → **Networks** → **Tunnels** → выбери свой туннель → **Configure**.
2. Вкладка **Public Hostname** → **Add a public hostname**.
3. Укажи поддомен, например: `ssh.rexten.live` (или `sftp.rexten.live`).
4. **Service type:** **SSH**.
5. **URL:** `localhost:22` (если `sshd` на другом порту — `localhost:ПОРТ`).
6. Сохрани.

DNS для этой записи Cloudflare обычно создаёт сам (CNAME на `*.cfargotunnel.com`). Если записи нет — в **DNS** зоны добавь **CNAME** `ssh` → тот же target, что у основного туннеля (Proxied).

---

## Шаг 2. Cloudflare Access (обязательно для `cloudflared access ssh`)

Без приложения Access клиентская команда `cloudflared access ssh` не отработает как задумано.

1. **Zero Trust** → **Access** → **Applications** → **Add an application**.
2. Тип: **Self-hosted**.
3. **Application domain:** тот же хост, что в туннеле, например `ssh.rexten.live` (без `https://`).
4. **Policy:** правило доступа — например **Allow** для твоего email (Google/GitHub OTP) или **One-time PIN**.
5. Сохрани.

При первом подключении браузер откроет страницу входа Cloudflare Access — это нормально.

---

## Шаг 3. Сервер: убедиться, что SSH безопасен

Рекомендуется ключи, без пароля root:

```bash
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload sshd
```

Публичный ключ пользователя должен быть в `~/.ssh/authorized_keys` на сервере.

---

## Шаг 4. Клиент (ноутбук): установить cloudflared

- **Linux:** пакет из [релизов](https://github.com/cloudflare/cloudflared/releases) или инструкция Cloudflare.
- **macOS:** `brew install cloudflared`.
- **Windows:** скачай `cloudflared.exe`, положи в PATH (например `C:\Windows\System32` или отдельная папка + PATH).

Проверка:

```bash
cloudflared --version
```

---

## Шаг 5. Клиент: `~/.ssh/config`

Подставь свой поддомен и пользователя Linux на сервере.

```sshconfig
Host rexten-sftp
    HostName ssh.rexten.live
    User ТВОЙ_ЛОГИН
    ProxyCommand cloudflared access ssh --hostname %h
```

На **Windows** путь к `cloudflared` может быть полным, например:

```sshconfig
Host rexten-sftp
    HostName ssh.rexten.live
    User ТВОЙ_ЛОГИН
    ProxyCommand "C:\\Program Files\\cloudflared\\cloudflared.exe" access ssh --hostname %h
```

Проверка в терминале:

```bash
ssh rexten-sftp
```

Должен открыться браузер (Access), после входа — сессия SSH.

---

## Шаг 6. FileZilla (SFTP)

1. **Файл** → **Менеджер сайтов** → **Новый сайт**.
2. Протокол: **SFTP – SSH File Transfer Protocol**.
3. Хост: **`rexten-sftp`** — **то же имя Host**, что в `~/.ssh/config` (FileZilla на Linux/macOS часто подхватывает `~/.ssh/config`).
4. Тип входа: **Ключевой файл** (или интерактивный / агент — как настроен SSH).
5. Пользователь: тот же, что в `User`.
6. В **Настройки передачи** при необходимости укажи путь к приватному ключу, если не через ssh-agent.

**Windows:** если FileZilla не видит алиас `Host`, в поле «Хост» иногда нужно указать **`ssh.rexten.live`**, а в **Редактирование → Настройки → SFTP** добавить файл `cloudflared` не получится напрямую — надёжнее использовать **WinSCP** с тем же `ProxyCommand` в PuTTY-формате или убедиться, что установлен **OpenSSH** (Windows 10+) и FileZilla использует системный `ssh` (см. документацию версии FileZilla).

Альтернатива: **WinSCP** → расширенные настройки сайта → **Tunnel** / интеграция с `ssh.exe` и тем же `config`.

---

## Если используешь `config.yml` у туннеля вместо UI

В секцию `ingress` добавь правило **перед** финальным `http_status:404`:

```yaml
  - hostname: ssh.rexten.live
    service: ssh://localhost:22
```

После правки перезапусти сервис `cloudflared` на сервере:

```bash
sudo systemctl restart cloudflared
# имя сервиса может отличаться: cloudflared@..., см. systemctl list-units | grep cloudflared
```

---

## Частые проблемы

| Симптом | Что проверить |
|--------|----------------|
| Таймаут | Туннель запущен? Запись **Public Hostname** сохранена? DNS **Proxied** на нужной зоне? |
| Access denied до SSH | Политика **Access** для `ssh.rexten.live`, твой email в Allow. |
| Connection refused | `sshd` слушает `127.0.0.1:22` на машине с туннелем; порт в туннеле совпадает. |
| FileZilla не ходит | Сначала добейся `ssh rexten-sftp` из терминала; затем те же Host/User/ключ. |

---

## Ссылки

- [SSH with client-side cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/ssh-cloudflared-authentication/)
- [Обзор сценариев SSH](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/ssh/)
