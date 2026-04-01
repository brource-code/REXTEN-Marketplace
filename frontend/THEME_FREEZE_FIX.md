# Описание проблемы: Зависание при изменении темы

## Проблема

При изменении темы через модалку конфигуратора (`ThemeConfigurator`) происходило зависание страницы, особенно при попытке кликнуть куда-либо после изменения темы. Браузер переставал отвечать, мышка не реагировала.

### Симптомы:
1. ✅ Изменение темы без кликов - работает нормально
2. ❌ Изменение темы + клик куда-либо - страница зависает
3. ❌ Браузер перестает отвечать на действия пользователя
4. ❌ Множественные POST запросы к `/business/schedule` и `/business/dashboard` (сотни запросов каждые 40-60ms)

## Причины проблемы

### 1. **startTransition блокировал обработку событий**
- `startTransition` откладывал обновления состояния
- При клике React пытался обработать и переход, и событие одновременно
- Это вызывало блокировку UI потока

### 2. **Синхронное обновление ConfigProvider**
- При изменении темы `ConfigProvider` обновлялся синхронно
- Все компоненты, использующие `useConfig()`, перерендеривались сразу
- Это вызывало массовые перерендеры и блокировку обработки событий

### 3. **Частые вызовы server actions**
- `setThemeCookies` вызывался при каждом изменении темы
- Server actions блокировали UI поток
- Это вызывало задержки и зависания

### 4. **Отсутствие debounce**
- Изменения темы не были защищены от множественных быстрых вызовов
- Это вызывало каскадные обновления

## Решение

### 1. Убрали `startTransition`
- Удален из `ThemeProvider` и `useTheme`
- Обновления состояния теперь синхронные, но легкие

### 2. Асинхронное обновление `themeState`
- Обновление через `requestAnimationFrame`
- Обработка событий не блокируется

### 3. Асинхронное обновление `ConfigProvider`
- Отдельное состояние для `ConfigProvider`
- Обновление через двойной `requestAnimationFrame`
- Компоненты с `useConfig` перерендериваются асинхронно

### 4. Отключили сохранение в cookies при изменении
- Сохранение только при закрытии модалки
- Используется `localStorage` для быстрого доступа

### 5. Добавили мемоизацию и debounce
- Все компоненты `ThemeConfigurator` мемоизированы
- Debounce для всех изменений темы (100ms)
- Оптимизированы селекторы `useTheme`

## Файлы, участвующие в решении

### Основные файлы темы:

1. **`src/components/template/Theme/ThemeProvider.jsx`**
   - Главный провайдер темы
   - Убрали `startTransition`
   - Добавили асинхронное обновление `themeState` и `ConfigProvider`
   - Отключили сохранение в cookies при изменении

2. **`src/utils/hooks/useTheme.js`**
   - Хук для работы с темой
   - Убрали `startTransition`
   - Оптимизировали DOM операции

3. **`src/components/template/Theme/ThemeContext.jsx`**
   - Контекст темы
   - Без изменений, но используется всеми компонентами

### Компоненты ThemeConfigurator:

4. **`src/components/template/ThemeConfigurator/ThemeConfigurator.jsx`**
   - Главный компонент конфигуратора
   - Мемоизирован с `memo()`

5. **`src/components/template/ThemeConfigurator/ModeSwitcher.jsx`**
   - Переключатель dark/light режима
   - Мемоизирован, добавлен debounce (100ms)

6. **`src/components/template/ThemeConfigurator/ThemeSwitcher.jsx`**
   - Переключатель схемы темы
   - Мемоизирован, добавлен debounce (100ms)

7. **`src/components/template/ThemeConfigurator/LayoutSwitcher.jsx`**
   - Переключатель layout
   - Мемоизирован, добавлен debounce (100ms)

8. **`src/components/template/ThemeConfigurator/DirectionSwitcher.jsx`**
   - Переключатель направления (LTR/RTL)
   - Мемоизирован, добавлен debounce (100ms)

9. **`src/components/template/ThemeConfigurator/CopyButton.jsx`**
   - Кнопка копирования конфига
   - Мемоизирован, оптимизирован селектор `useTheme`

### Компоненты модалки:

10. **`src/components/template/SidePanel/SidePanel.jsx`**
    - Контейнер модалки темы
    - Добавлено сохранение темы при закрытии через `requestIdleCallback`
    - Оптимизировано закрытие

11. **`src/components/template/SidePanel/SidePanelContent.jsx`**
    - Контент модалки
    - Мемоизирован

### UI компоненты:

12. **`src/components/ui/Drawer/Drawer.jsx`**
    - Компонент Drawer (модалка)
    - Мемоизированы вычисления стилей
    - Оптимизирована анимация framer-motion
    - Отключена layout анимация

13. **`src/components/ui/ConfigProvider/ConfigProvider.js`**
    - Провайдер конфигурации
    - Используется всеми UI компонентами
    - Без изменений, но оптимизировано обновление

### Утилиты:

14. **`src/utils/applyThemeSchema.js`**
    - Применение схемы темы к DOM
    - Без изменений, но вызывается асинхронно

15. **`src/server/actions/theme.js`**
    - Server actions для работы с темой в cookies
    - Без изменений, но вызывается только при закрытии модалки

### Дополнительные оптимизации:

16. **`src/components/auth/AuthInitializer.jsx`**
    - Инициализатор авторизации
    - Оптимизирован для предотвращения бесконечных обновлений

17. **`src/store/authStore.js`**
    - Store авторизации
    - Оптимизирован `checkAuth` для предотвращения лишних обновлений

## Результат

✅ Изменение темы работает плавно
✅ Клики обрабатываются сразу после изменения темы
✅ Нет зависаний браузера
✅ Нет массовых POST запросов
✅ Все обновления асинхронные и не блокируют UI

## Технические детали

### Асинхронные обновления:
- `themeState` обновляется через `requestAnimationFrame`
- `ConfigProvider` обновляется через двойной `requestAnimationFrame`
- DOM операции через `requestAnimationFrame` или `setTimeout`

### Мемоизация:
- Все компоненты `ThemeConfigurator` обернуты в `memo()`
- Все функции обернуты в `useCallback()`
- Все вычисления мемоизированы через `useMemo()`

### Debounce:
- Все изменения темы защищены debounce (100ms)
- Сохранение в cookies только при закрытии модалки

