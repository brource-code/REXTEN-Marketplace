# Полный комплект логотипа для использования в других проектах

## Структура логотипа

Логотип состоит из двух частей:
1. **Иконка** - SVG с градиентами и эффектом глубины
2. **Текст** - Название приложения (для Laravel: "REXTEN", для React: "Ecme")

---

## 1. SVG Иконка (Blade/Laravel версия)

### Файл: `macros.blade.php`

```blade
@php
  $width = $width ?? '30';
@endphp

<span class="text-primary">
  <svg width="{{ $width }}" viewBox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <!-- Градиенты для слоев -->
      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:currentColor;stop-opacity:1" />
        <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.6" />
      </linearGradient>
      <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:currentColor;stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.4" />
      </linearGradient>
      <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:currentColor;stop-opacity:0.6" />
        <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.2" />
      </linearGradient>

      <!-- Основной слой -->
      <path d="M4 8L15 2L26 8L15 14L4 8Z" id="layer-1"></path>
      <!-- Второй слой -->
      <path d="M4 14L15 8L26 14L15 20L4 14Z" id="layer-2"></path>
      <!-- Третий слой -->
      <path d="M4 20L15 14L26 20L15 26L4 20Z" id="layer-3"></path>
    </defs>
    <g id="g-app-brand" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
      <g id="Brand-Logo" transform="translate(0, 0)">
        <g id="Icon">
          <!-- Основной слой с градиентом -->
          <g id="Layer-1">
            <use fill="url(#gradient1)" xlink:href="#layer-1"></use>
            <use fill-opacity="0.3" fill="#FFFFFF" xlink:href="#layer-1"></use>
          </g>
          <!-- Второй слой с эффектом глубины -->
          <g id="Layer-2" transform="translate(1, 2)">
            <use fill="url(#gradient2)" xlink:href="#layer-2"></use>
            <use fill-opacity="0.2" fill="#FFFFFF" xlink:href="#layer-2"></use>
          </g>
          <!-- Третий слой с эффектом глубины -->
          <g id="Layer-3" transform="translate(2, 4)">
            <use fill="url(#gradient3)" xlink:href="#layer-3"></use>
            <use fill-opacity="0.1" fill="#FFFFFF" xlink:href="#layer-3"></use>
          </g>
        </g>
      </g>
    </g>
  </svg>
</span>
```

### Использование в Blade шаблонах:

```blade
<a href="{{ url('/') }}" class="app-brand-link gap-2">
  <span class="app-brand-logo demo">@include('_partials.macros')</span>
  <span class="app-brand-text demo menu-text fw-bold text-heading">{{ config('variables.templateName') }}</span>
</a>
```

**Важно:** SVG использует `currentColor`, что означает, что цвет иконки автоматически адаптируется к теме через CSS класс `text-primary`. В светлой теме цвет будет одним, в темной - другим.

---

## 2. React компонент логотипа

### Файл: `Logo.jsx`

```jsx
import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import Image from 'next/image'

const LOGO_SRC_PATH = '/img/logo/'

const Logo = (props) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        style,
        logoWidth,
        logoHeight,
    } = props

    const width = logoWidth || (type === 'full' ? 120 : 40)
    const height = logoHeight || (type === 'full' ? 40 : 40)

    return (
        <div className={classNames('logo', className)} style={style}>
            {mode === 'light' && (
                <>
                    <Image
                        className={classNames(
                            '',
                            type === 'full' ? '' : 'hidden',
                            imgClass,
                        )}
                        src={`${LOGO_SRC_PATH}logo-light-full.png`}
                        alt={`${APP_NAME} logo`}
                        width={width}
                        height={height}
                        priority
                    />
                    <Image
                        className={classNames(
                            '',
                            type === 'streamline' ? '' : 'hidden',
                            imgClass,
                        )}
                        src={`${LOGO_SRC_PATH}logo-light-streamline.png`}
                        alt={`${APP_NAME} logo`}
                        width={width}
                        height={height}
                        priority
                    />
                </>
            )}
            {mode === 'dark' && (
                <>
                    <Image
                        className={classNames(
                            type === 'full' ? '' : 'hidden',
                            imgClass,
                        )}
                        src={`${LOGO_SRC_PATH}logo-dark-full.png`}
                        alt={`${APP_NAME} logo`}
                        width={width}
                        height={height}
                        priority
                    />
                    <Image
                        className={classNames(
                            type === 'streamline' ? '' : 'hidden',
                            imgClass,
                        )}
                        src={`${LOGO_SRC_PATH}logo-dark-streamline.png`}
                        alt={`${APP_NAME} logo`}
                        width={width}
                        height={height}
                        priority
                    />
                </>
            )}
        </div>
    )
}

export default Logo
```

### Использование:

```jsx
import Logo from '@/components/template/Logo'
import useTheme from '@/utils/hooks/useTheme'

const HeaderLogo = () => {
    const mode = useTheme((state) => state.mode)

    return (
        <Link href="/">
            <Logo
                imgClass="max-h-10"
                mode={mode}
                className="hidden lg:block"
                type="full" // или "streamline"
            />
        </Link>
    )
}
```

---

## 3. CSS стили для логотипа

### Файл: `_app-brand.scss`

```scss
/* App Brand */
.app-brand {
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  align-items: center;

  .app-brand-text {
    opacity: 1;
    transition: opacity $menu-animation-duration ease-in-out;
  }

  .layout-menu-toggle {
    display: block;
  }

  .app-brand-img{
    display: block;
  }
  .app-brand-img-collapsed{
    display: none;
  }
}

.app-brand-link {
  display: flex;
  align-items: center;
}

/* App brand with vertical menu */
.menu-horizontal .app-brand,
.menu-horizontal .app-brand + .menu-divider {
  display: none !important;
}

@include media-breakpoint-up($menu-collapsed-layout-breakpoint) {
  .layout-menu-collapsed:not(.layout-menu-hover) .layout-menu,
  .menu-collapsed:not(:hover) .app-brand {
    .app-brand-logo ~ .app-brand-text{
      opacity: 0;
    }
    .app-brand-img{
      display: none;
    }
    .app-brand-img-collapsed{
      display: block;
    }
  }
}

/* Within menu */
:not(.layout-menu) > .menu-vertical.menu-collapsed:not(.layout-menu):not(:hover),
.layout-menu-collapsed:not(.layout-menu-hover):not(.layout-menu-offcanvas):not(.layout-menu-fixed-offcanvas) .layout-menu {
  .app-brand {
    inline-size: $menu-collapsed-width;
  }

  .app-brand-logo,
  .app-brand-link,
  .app-brand-text {
    margin-inline: auto;
  }

  .app-brand-logo ~ .app-brand-text {
    overflow: hidden;
    opacity: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .app-brand .layout-menu-toggle {
    inset-inline-start: calc(#{$menu-collapsed-width} - 1.5rem);
    opacity: 0;
  }

  .app-brand-img {
    display: none;
  }

  .app-brand-img-collapsed {
    display: block;
  }
}
```

---

## 4. Конфигурация названия

### Laravel: `config/variables.php`

```php
<?php
return [
  "templateName" => "REXTEN",
  // ... другие настройки
];
```

### React: `constants/app.constant.js`

```javascript
export const APP_NAME = 'Ecme'
```

---

## 5. Необходимые изображения PNG

Для React версии нужны следующие файлы в папке `/public/img/logo/`:

- `logo-light-full.png` - Полный логотип (иконка + текст) для светлой темы
- `logo-dark-full.png` - Полный логотип (иконка + текст) для темной темы
- `logo-light-streamline.png` - Только иконка для светлой темы
- `logo-dark-streamline.png` - Только иконка для темной темы

**Примечание:** Эти файлы должны быть созданы на основе SVG иконки и текста логотипа.

---

## 6. HTML версия (универсальная)

Если нужно использовать в обычном HTML проекте:

```html
<!-- Светлая тема -->
<div class="app-brand">
  <a href="/" class="app-brand-link">
    <span class="app-brand-logo">
      <svg width="30" viewBox="0 0 30 30" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:currentColor;stop-opacity:1" />
            <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.6" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:currentColor;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.4" />
          </linearGradient>
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:currentColor;stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:currentColor;stop-opacity:0.2" />
          </linearGradient>
          <path d="M4 8L15 2L26 8L15 14L4 8Z" id="layer-1"></path>
          <path d="M4 14L15 8L26 14L15 20L4 14Z" id="layer-2"></path>
          <path d="M4 20L15 14L26 20L15 26L4 20Z" id="layer-3"></path>
        </defs>
        <g id="g-app-brand" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
          <g id="Brand-Logo" transform="translate(0, 0)">
            <g id="Icon">
              <g id="Layer-1">
                <use fill="url(#gradient1)" xlink:href="#layer-1"></use>
                <use fill-opacity="0.3" fill="#FFFFFF" xlink:href="#layer-1"></use>
              </g>
              <g id="Layer-2" transform="translate(1, 2)">
                <use fill="url(#gradient2)" xlink:href="#layer-2"></use>
                <use fill-opacity="0.2" fill="#FFFFFF" xlink:href="#layer-2"></use>
              </g>
              <g id="Layer-3" transform="translate(2, 4)">
                <use fill="url(#gradient3)" xlink:href="#layer-3"></use>
                <use fill-opacity="0.1" fill="#FFFFFF" xlink:href="#layer-3"></use>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </span>
    <span class="app-brand-text fw-bold">REXTEN</span>
  </a>
</div>
```

### CSS для HTML версии:

```css
.app-brand {
  display: flex;
  align-items: center;
}

.app-brand-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.app-brand-logo {
  color: var(--primary-color, #696cff); /* Цвет для светлой темы */
}

[data-bs-theme="dark"] .app-brand-logo {
  color: var(--primary-color-dark, #696cff); /* Цвет для темной темы */
}

.app-brand-text {
  font-weight: bold;
  color: var(--text-heading-color, #566a7f);
}

[data-bs-theme="dark"] .app-brand-text {
  color: var(--text-heading-color-dark, #a1acb8);
}
```

---

## Особенности реализации

1. **SVG иконка адаптивна к теме** - использует `currentColor`, который берется из CSS класса `text-primary`
2. **Текст логотипа** - настраивается через конфигурацию (Laravel) или константы (React)
3. **Два типа логотипа**:
   - `full` - иконка + текст (для React используется PNG)
   - `streamline` - только иконка (для React используется PNG)
4. **Поддержка тем** - автоматическое переключение между светлой и темной темой

---

## Рекомендации для использования в другом проекте

1. Скопируйте SVG код иконки
2. Создайте PNG изображения для React версии (если нужна)
3. Настройте название приложения в конфигурации
4. Примените CSS стили для правильного отображения
5. Убедитесь, что цветовая схема (`text-primary`) настроена для обеих тем

