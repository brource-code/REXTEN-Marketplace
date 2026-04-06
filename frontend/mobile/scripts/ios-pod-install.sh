#!/usr/bin/env bash
# Запускать на macOS после клонирования или обновления нативных зависимостей.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/ios"
if ! command -v pod >/dev/null 2>&1; then
  echo "Установите CocoaPods: sudo gem install cocoapods  (или brew install cocoapods)"
  exit 1
fi
pod install
echo ""
echo "Готово. Откройте в Xcode: $ROOT/ios/Rexten.xcworkspace"
