# Инструкция по тестированию регистрации бизнеса

## Шаги для тестирования:

1. Откройте браузер и перейдите на страницу регистрации бизнеса
2. Заполните форму регистрации:
   - Имя: Test
   - Фамилия: User
   - Email: test_registration_XXXX@example.com (замените XXXX на случайное число)
   - Пароль: password123
   - Подтверждение пароля: password123
   - Название бизнеса: Test Business Registration
   - Описание: Test description
   - Адрес: 123 Test Street
   - Телефон бизнеса: +1234567890
   - Email бизнеса: test_business@example.com
   - Веб-сайт: https://test-business.com

3. Откройте консоль браузера (F12) и проверьте логи:
   - Должно быть сообщение "📤 Отправка данных компании на сервер"
   - Должно быть сообщение "✅ Данные компании успешно сохранены" или ошибка

4. После регистрации проверьте в базе данных:
   ```bash
   cd backend
   php artisan tinker
   $user = App\Models\User::where('email', 'test_registration_XXXX@example.com')->first();
   $company = $user->ownedCompanies()->first();
   echo $company->name . "\n";
   echo $company->address . "\n";
   echo $company->phone . "\n";
   ```

## Ожидаемый результат:

- Компания должна быть создана
- Все данные из формы должны быть сохранены в компании
- Адрес, телефон, описание, веб-сайт должны быть заполнены

