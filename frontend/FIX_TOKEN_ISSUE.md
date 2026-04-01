# 🔧 Исправление проблемы с токеном (403 ошибка)

## Проблема
Токен не имеет прав на запись в репозиторий.

## Решение

### Вариант 1: Пересоздать токен с правильными правами

1. Перейдите на https://github.com/settings/tokens
2. Найдите ваш токен "REXTEN Marketplace" и **удалите его**
3. Создайте новый токен:
   - **Generate new token (classic)**
   - Название: `REXTEN Marketplace`
   - **Обязательно отметьте галочку `repo`** (полный доступ к репозиториям)
   - Можно также отметить `workflow` если используете Actions
4. Скопируйте новый токен
5. Выполните:
```bash
git remote set-url origin https://НОВЫЙ_ТОКЕН@github.com/brource-code/REXTEN-Marketplace.git
git push -u origin main
```

### Вариант 2: Если используете Fine-grained token

Fine-grained токены требуют:
1. Выбрать конкретный репозиторий: `REXTEN-Marketplace`
2. Установить права:
   - **Contents**: Read and write
   - **Metadata**: Read-only
3. После создания используйте токен так же

### Вариант 3: Использовать SSH (если настроен)

```bash
# Создайте SSH ключ (если еще нет)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Скопируйте публичный ключ
cat ~/.ssh/id_ed25519.pub

# Добавьте ключ в GitHub: Settings > SSH and GPG keys

# Измените remote
git remote set-url origin git@github.com:brource-code/REXTEN-Marketplace.git

# Отправьте код
git push -u origin main
```

## Проверка прав токена

Токен должен иметь минимум право **`repo`** для записи в репозиторий.







