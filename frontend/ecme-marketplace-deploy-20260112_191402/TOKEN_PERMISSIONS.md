# 🔐 Необходимые права для GitHub Personal Access Token

## Для работы с репозиторием REXTEN-Marketplace нужны следующие права:

### ✅ Обязательные права (scopes):

1. **`repo`** - **САМОЕ ВАЖНОЕ!**
   - Полный контроль над приватными репозиториями
   - Включает в себя:
     - `repo:status` - доступ к статусу коммитов
     - `repo_deployment` - доступ к деплоям
     - `public_repo` - доступ к публичным репозиториям
     - `repo:invite` - приглашения в репозиторий
     - `security_events` - события безопасности

### 📋 Дополнительные права (опционально):

2. **`workflow`** (если используете GitHub Actions)
   - Обновление файлов GitHub Actions

3. **`write:packages`** (если публикуете пакеты)
   - Загрузка пакетов в GitHub Packages

4. **`delete:packages`** (если удаляете пакеты)
   - Удаление пакетов из GitHub Packages

## 🎯 Минимум для работы:

**ТОЛЬКО `repo`** - этого достаточно для:
- ✅ Клонирования репозитория
- ✅ Отправки коммитов (push)
- ✅ Создания веток
- ✅ Создания pull requests
- ✅ Управления файлами в репозитории

## 📝 Как проверить права токена:

1. Перейдите на https://github.com/settings/tokens
2. Найдите ваш токен
3. Нажмите на него, чтобы увидеть детали
4. Проверьте, что в разделе "Scopes" есть **`repo`**

## ⚠️ Если используете Fine-grained token:

Для Fine-grained токена нужно:
1. Выбрать репозиторий: **REXTEN-Marketplace**
2. Установить права:
   - **Repository permissions** → **Contents**: **Read and write**
   - **Repository permissions** → **Metadata**: **Read-only**
   - **Repository permissions** → **Pull requests**: **Read and write** (опционально)
   - **Repository permissions** → **Issues**: **Read and write** (опционально)

## 🔍 Проверка прав через API:

Можно проверить права токена через API:
```bash
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

## 💡 Рекомендация:

Используйте **Tokens (classic)** с правом **`repo`** - это самый простой и надежный способ.






