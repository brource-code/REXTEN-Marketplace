# Примеры использования логотипа

## 1. Blade шаблон (Laravel)

```blade
<div class="navbar-brand app-brand demo">
  <a href="{{ url('/') }}" class="app-brand-link gap-2">
    <span class="app-brand-logo demo">@include('_partials.macros')</span>
    <span class="app-brand-text demo menu-text fw-bold text-heading">{{ config('variables.templateName') }}</span>
  </a>
</div>
```

## 2. React компонент

```jsx
import Logo from '@/components/template/Logo'
import useTheme from '@/utils/hooks/useTheme'
import Link from 'next/link'

const HeaderLogo = () => {
    const mode = useTheme((state) => state.mode)

    return (
        <Link href="/">
            <Logo
                imgClass="max-h-10"
                mode={mode}
                className="hidden lg:block"
                type="full"
            />
        </Link>
    )
}
```

## 3. Чистый HTML

```html
<div class="app-brand">
  <a href="/" class="app-brand-link">
    <span class="app-brand-logo">
      <!-- SVG код из logo-svg.html -->
    </span>
    <span class="app-brand-text fw-bold">REXTEN</span>
  </a>
</div>
```

## 4. Vue.js компонент

```vue
<template>
  <div class="app-brand">
    <a href="/" class="app-brand-link">
      <span class="app-brand-logo" v-html="logoSvg"></span>
      <span class="app-brand-text fw-bold">{{ appName }}</span>
    </a>
  </div>
</template>

<script>
export default {
  data() {
    return {
      appName: 'REXTEN',
      logoSvg: `<!-- SVG код -->`
    }
  }
}
</script>
```

## 5. Angular компонент

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <div class="app-brand">
      <a href="/" class="app-brand-link">
        <span class="app-brand-logo" [innerHTML]="logoSvg"></span>
        <span class="app-brand-text fw-bold">{{ appName }}</span>
      </a>
    </div>
  `
})
export class LogoComponent {
  appName = 'REXTEN';
  logoSvg = `<!-- SVG код -->`;
}
```

