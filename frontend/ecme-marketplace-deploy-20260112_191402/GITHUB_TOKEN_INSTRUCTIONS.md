# 📝 Пошаговая инструкция: Как создать Personal Access Token на GitHub

## Шаг 1: Войдите в GitHub
1. Откройте браузер и перейдите на https://github.com
2. Войдите в свой аккаунт

## Шаг 2: Откройте настройки токенов
1. Нажмите на **ваш аватар** (правый верхний угол)
2. Выберите **Settings** (Настройки)
3. В левом меню прокрутите вниз до раздела **Developer settings**
4. Нажмите на **Developer settings**
5. В левом меню выберите **Personal access tokens**
6. Выберите **Tokens (classic)** или **Fine-grained tokens**

## Шаг 3: Создайте новый токен (Tokens classic - проще)
1. Нажмите кнопку **"Generate new token"**
2. Выберите **"Generate new token (classic)"**
3. Введите название токена (например: "REXTEN Marketplace")
4. Выберите срок действия (expiration):
   - Рекомендуется: **90 days** или **No expiration** (если хотите, чтобы токен не истекал)
5. Отметьте права доступа (scopes):
   - ✅ **repo** (полный доступ к репозиториям) - это самое важное!
   - Можно также отметить **workflow** если используете GitHub Actions
6. Прокрутите вниз и нажмите **"Generate token"**

## Шаг 4: Скопируйте токен
⚠️ **ВАЖНО**: Токен показывается только один раз! Скопируйте его сразу!

1. После создания токена вы увидите его на экране
2. **Скопируйте токен** (он будет выглядеть как: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
3. Сохраните токен в безопасном месте

## Шаг 5: Используйте токен для подключения

Выполните в терминале:

```bash
# Замените YOUR_TOKEN на скопированный токен
git remote set-url origin https://YOUR_TOKEN@github.com/brource-code/REXTEN-Marketplace.git

# Отправьте код
git push -u origin main
```

## Альтернативный способ: Fine-grained tokens (более безопасно)

1. В разделе Personal access tokens выберите **"Fine-grained tokens"**
2. Нажмите **"Generate new token"**
3. Заполните:
   - **Token name**: REXTEN Marketplace
   - **Expiration**: выберите срок
   - **Repository access**: выберите "Only select repositories" и выберите "REXTEN-Marketplace"
   - **Repository permissions**: 
     - Contents: Read and write
     - Metadata: Read-only
4. Нажмите **"Generate token"**
5. Скопируйте токен и используйте так же, как описано выше

## 🔒 Безопасность

- Никогда не публикуйте токен в открытом доступе
- Не коммитьте токен в git
- Если токен скомпрометирован, немедленно удалите его в настройках GitHub

## 📍 Прямая ссылка

Если вы уже авторизованы, можете перейти напрямую:
- **Tokens (classic)**: https://github.com/settings/tokens
- **Fine-grained tokens**: https://github.com/settings/tokens?type=beta






