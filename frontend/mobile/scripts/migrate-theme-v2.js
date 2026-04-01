#!/usr/bin/env node
/**
 * Скрипт миграции v2 - обрабатывает оставшийся хардкод.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Дополнительные цвета для замены
const EXTRA_COLORS = {
  // Статусы и специфичные цвета
  '#3b82f6': 'theme.primary',
  '#f59e0b': 'theme.warning',
  '#8b5cf6': 'theme.purple',
  '#9333ea': 'theme.purple',
  '#ca8a04': 'theme.warning',
  '#1d4ed8': 'theme.primaryDark',
  '#16a34a': 'theme.success',
  '#dc2626': 'theme.error',
  '#f87171': 'theme.error',
  '#10b981': 'theme.success',
  '#34d399': 'theme.success',
  '#fbbf24': 'theme.warning',
  '#a78bfa': 'theme.purple',
  '#60a5fa': 'theme.info',
  
  // Фоны статусов
  '#fef9c3': 'theme.warningLight',
  '#d1fae5': 'theme.successLight',
  '#dbeafe': 'theme.primaryLight',
  '#fecaca': 'theme.errorLight',
  '#fee2e2': 'theme.errorLight',
  '#ede9fe': 'theme.purpleLight',
  '#e0e7ff': 'theme.purpleLight',
  '#dcfce7': 'theme.successLight',
  '#fef3c7': 'theme.warningLight',
  '#ffedd5': 'theme.warningLight',
  '#fef2f2': 'theme.errorLight',
  '#ecfdf5': 'theme.successLight',
  
  // Тёмные варианты
  '#1e40af': 'theme.primaryDark',
  '#1e3a8a': 'theme.primaryDark',
  '#065f46': 'theme.successDark',
  '#991b1b': 'theme.error',
  '#92400e': 'theme.warning',
  '#9a3412': 'theme.warning',
  '#713f12': 'theme.warningLight',
  '#5b21b6': 'theme.purple',
  '#4c1d95': 'theme.purpleLight',
  '#7f1d1d': 'theme.errorLight',
  '#3f1d1d': 'theme.errorLight',
  '#78350f': 'theme.warningLight',
  '#064e3b': 'theme.successLight',
  '#1e3a5f': 'theme.infoLight',
  
  // Границы и фоны
  '#f4f4f5': 'theme.backgroundTertiary',
  '#93c5fd': 'theme.primaryLight',
  '#bfdbfe': 'theme.primaryLight',
  '#a7f3d0': 'theme.successLight',
  '#86efac': 'theme.successLight',
  '#fcd34d': 'theme.warning',
  '#fdba74': 'theme.warningLight',
  '#f97316': 'theme.warning',
  '#eab308': 'theme.warning',
  '#4f46e5': 'theme.purple',
  '#eff6ff': 'theme.infoLight',
};

function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (item !== 'node_modules' && item !== 'theme') {
        getAllFiles(fullPath, files);
      }
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const changes = [];
  
  // Пропускаем файлы темы
  if (filePath.includes('/theme/')) {
    return { modified: false, changes: [] };
  }
  
  // Заменяем цвета в color:, backgroundColor:, borderColor: и т.д.
  for (const [color, token] of Object.entries(EXTRA_COLORS)) {
    const patterns = [
      // В стилях
      new RegExp(`(color|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|tintColor):\\s*['"]${color}['"]`, 'gi'),
      // В color= атрибутах
      new RegExp(`color=['"]${color}['"]`, 'gi'),
      // В Ionicons color
      new RegExp(`color=\\{['"]${color}['"]\\}`, 'gi'),
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          const propName = match.split(/[=:]/)[0];
          if (match.includes('={')) {
            return `${propName}={${token}}`;
          } else if (match.includes('=')) {
            return `${propName}={${token}}`;
          } else {
            return `${propName}: ${token}`;
          }
        });
        changes.push(`${color} → ${token}`);
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
  }
  
  return { modified, changes: [...new Set(changes)] };
}

// Запуск
console.log('\n🚀 Миграция v2 - дополнительные цвета...\n');

const files = getAllFiles(SRC_DIR);
let migratedCount = 0;

for (const file of files) {
  const { modified, changes } = migrateFile(file);
  if (modified) {
    const relativePath = path.relative(SRC_DIR, file);
    console.log(`✅ ${relativePath}`);
    changes.slice(0, 5).forEach(c => console.log(`   - ${c}`));
    if (changes.length > 5) console.log(`   ... и ещё ${changes.length - 5}`);
    migratedCount++;
  }
}

console.log(`\n📊 Мигрировано файлов: ${migratedCount}\n`);
