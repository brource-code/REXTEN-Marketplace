# 🔍 Как найти QR-код

## Способ 1: Перезапустить Expo с Tunnel (рекомендуется)

Выполните в терминале:

```bash
cd "/Users/turbin/Desktop/REXTEN marketplace/ecme-admin/mobile"
npx expo start --tunnel
```

Tunnel mode покажет QR-код **сразу и явно**, и будет работать даже если iPhone в другой сети.

---

## Способ 2: Найти URL в терминале

В терминале Expo найдите строку, которая выглядит так:

```
› Metro waiting on exp://192.168.1.72:8081
```

или

```
› Tunnel ready. 
  › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**Скопируйте URL** (например: `exp://192.168.1.72:8081`) и:

1. Откройте **Expo Go** на iPhone
2. Нажмите **"Enter URL manually"**
3. Вставьте URL

---

## Способ 3: Использовать веб-интерфейс

Откройте в браузере:
```
http://localhost:8081
```

Там будет QR-код и все инструкции!

---

## Способ 4: iOS симулятор (Mac)

Если у вас Mac, просто нажмите в терминале Expo:
```
i
```

Это откроет приложение прямо в симуляторе iPhone на вашем Mac.

---

## 🎯 Самый простой способ:

1. **Остановите Expo** (Ctrl+C в терминале)
2. **Запустите заново**:
   ```bash
   cd "/Users/turbin/Desktop/REXTEN marketplace/ecme-admin/mobile"
   npx expo start --tunnel
   ```
3. **QR-код появится сразу** в терминале
4. Отсканируйте его в Expo Go

