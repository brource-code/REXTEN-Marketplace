Снимок фронтенда REXTEN: клиентская часть маркетплейса (каталог, объявления, компании,
профиль клиента, бронирование, связанные API и оболочка публичного сайта).

Включено по смыслу:
- app/(public)/ — страницы каталога, маркетплейса, профиля, заказов, оплаты, входа и т.д.
  (исключены несвязанные разделы: babki, manual-test, vasilisa, business demo).
- app/client/ — кабинет клиента (заказы, скидки, профиль).
- app/(public-pages)/for-business — лендинг для бизнеса (ссылки из футера).
- components/layouts/PublicLayout, marketplace, location, shared, ui, auth (часть),
  loyalty, reviews, seo (фрагменты), BookingAdditionalServices, business/booking/shared (пресеты слотов).
- lib/api: marketplace, marketplace-server, client, bookings, stripe; lib/seo.
- store, hooks/api, services/axios, utils, constants, mocks/tags, configs/app.config.js.
- messages: все 5 локалей (полные файлы для согласованности ключей).
- jsconfig.json, package.json — для ориентира в зависимостях.

Дата сборки архива: см. имя файла rexten-client-marketplace-frontend-*.tar.gz
