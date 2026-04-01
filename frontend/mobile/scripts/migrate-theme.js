#!/usr/bin/env node
/**
 * Скрипт автоматической миграции на новую систему тем.
 * 
 * Что делает:
 * 1. Заменяет импорт старого ThemeContext на новый
 * 2. Заменяет colors.xxx на theme.xxx
 * 3. Удаляет хардкод цветов
 * 
 * Запуск: node scripts/migrate-theme.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Маппинг цветов на токены темы
const COLOR_TO_TOKEN = {
  // Белые
  '#ffffff': 'theme.card',
  '#fff': 'theme.card',
  "'white'": 'theme.card',
  '"white"': 'theme.card',
  
  // Чёрные
  '#000000': 'theme.text',
  '#000': 'theme.text',
  "'black'": 'theme.text',
  '"black"': 'theme.text',
  
  // Фоны
  '#f9fafb': 'theme.backgroundSecondary',
  '#f3f4f6': 'theme.backgroundTertiary',
  '#fafafa': 'theme.backgroundSecondary',
  
  // Тексты
  '#111827': 'theme.text',
  '#1f2937': 'theme.text',
  '#374151': 'theme.textSecondary',
  '#4b5563': 'theme.textSecondary',
  '#6b7280': 'theme.textSecondary',
  '#9ca3af': 'theme.textMuted',
  
  // Границы
  '#e5e7eb': 'theme.border',
  '#d1d5db': 'theme.inputBorder',
  
  // Primary
  '#2563eb': 'theme.primary',
  '#3b82f6': 'theme.primary',
  '#1d4ed8': 'theme.primaryDark',
  '#dbeafe': 'theme.primaryLight',
  '#93c5fd': 'theme.primaryLight',
  '#bfdbfe': 'theme.primaryLight',
  '#1e40af': 'theme.primaryDark',
  '#1e3a8a': 'theme.primaryDark',
  
  // Success
  '#10b981': 'theme.success',
  '#059669': 'theme.success',
  '#16a34a': 'theme.success',
  '#065f46': 'theme.successDark',
  '#d1fae5': 'theme.successLight',
  '#dcfce7': 'theme.successLight',
  '#ecfdf5': 'theme.successLight',
  '#a7f3d0': 'theme.successLight',
  '#86efac': 'theme.successLight',
  '#34d399': 'theme.success',
  
  // Error
  '#ef4444': 'theme.error',
  '#dc2626': 'theme.error',
  '#f87171': 'theme.error',
  '#991b1b': 'theme.error',
  '#7f1d1d': 'theme.errorLight',
  '#fecaca': 'theme.errorLight',
  '#fee2e2': 'theme.errorLight',
  
  // Warning
  '#f59e0b': 'theme.warning',
  '#d97706': 'theme.warning',
  '#eab308': 'theme.warning',
  '#ca8a04': 'theme.warning',
  '#fbbf24': 'theme.warning',
  '#fcd34d': 'theme.warning',
  '#92400e': 'theme.warning',
  '#78350f': 'theme.warningLight',
  '#713f12': 'theme.warningLight',
  '#fef3c7': 'theme.warningLight',
  '#fef9c3': 'theme.warningLight',
  '#ffedd5': 'theme.warningLight',
  '#fdba74': 'theme.warningLight',
  '#f97316': 'theme.warning',
  
  // Purple
  '#7c3aed': 'theme.purple',
  '#8b5cf6': 'theme.purple',
  '#9333ea': 'theme.purple',
  '#a78bfa': 'theme.purple',
  '#4f46e5': 'theme.purple',
  '#5b21b6': 'theme.purple',
  '#4c1d95': 'theme.purpleLight',
  '#ede9fe': 'theme.purpleLight',
  '#e9d5ff': 'theme.purpleLight',
  '#e0e7ff': 'theme.purpleLight',
  
  // Info
  '#60a5fa': 'theme.info',
  '#1e3a5f': 'theme.infoLight',
  '#eff6ff': 'theme.infoLight',
  
  // Другие
  '#f4f4f5': 'theme.backgroundTertiary',
  '#3f1d1d': 'theme.errorLight',
  '#fef2f2': 'theme.errorLight',
};

// Маппинг colors.xxx на theme.xxx
const COLORS_TO_THEME = {
  'colors.background': 'theme.background',
  'colors.backgroundSecondary': 'theme.backgroundSecondary',
  'colors.backgroundTertiary': 'theme.backgroundTertiary',
  'colors.card': 'theme.card',
  'colors.cardBorder': 'theme.cardBorder',
  'colors.text': 'theme.text',
  'colors.textSecondary': 'theme.textSecondary',
  'colors.textMuted': 'theme.textMuted',
  'colors.textInverse': 'theme.textInverse',
  'colors.primary': 'theme.primary',
  'colors.primaryLight': 'theme.primaryLight',
  'colors.primaryDark': 'theme.primaryDark',
  'colors.border': 'theme.border',
  'colors.inputBackground': 'theme.inputBackground',
  'colors.inputBorder': 'theme.inputBorder',
  'colors.success': 'theme.success',
  'colors.successLight': 'theme.successLight',
  'colors.successDark': 'theme.successDark',
  'colors.error': 'theme.error',
  'colors.errorLight': 'theme.errorLight',
  'colors.warning': 'theme.warning',
  'colors.warningLight': 'theme.warningLight',
  'colors.info': 'theme.info',
  'colors.infoLight': 'theme.infoLight',
  'colors.purple': 'theme.purple',
  'colors.purpleLight': 'theme.purpleLight',
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
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Пропускаем файлы темы
  if (filePath.includes('/theme/')) {
    return { modified: false, changes: [] };
  }
  
  const changes = [];
  
  // 1. Заменяем импорт старого ThemeContext
  if (content.includes("from '../../contexts/ThemeContext'") || 
      content.includes("from '../contexts/ThemeContext'") ||
      content.includes("from './contexts/ThemeContext'")) {
    
    // Определяем правильный путь к theme
    let themePath = '../theme';
    if (filePath.includes('/screens/business/')) {
      themePath = '../../theme';
    } else if (filePath.includes('/screens/')) {
      themePath = '../../theme';
    } else if (filePath.includes('/components/business/')) {
      themePath = '../../theme';
    } else if (filePath.includes('/components/ui/')) {
      themePath = '../../theme';
    } else if (filePath.includes('/components/')) {
      themePath = '../theme';
    }
    
    content = content.replace(
      /from ['"]\.\.\/\.\.\/contexts\/ThemeContext['"]/g,
      `from '${themePath}'`
    );
    content = content.replace(
      /from ['"]\.\.\/contexts\/ThemeContext['"]/g,
      `from '${themePath}'`
    );
    content = content.replace(
      /from ['"]\.\/contexts\/ThemeContext['"]/g,
      `from '${themePath}'`
    );
    
    changes.push('Обновлён импорт ThemeContext → theme');
    modified = true;
  }
  
  // 2. Заменяем { colors } = useTheme() на { theme } = useTheme()
  if (content.includes('const { colors }') || content.includes('const { colors,')) {
    content = content.replace(
      /const \{ colors \} = useTheme\(\)/g,
      'const { theme } = useTheme()'
    );
    content = content.replace(
      /const \{ colors, isDark \} = useTheme\(\)/g,
      'const { theme, isDark } = useTheme()'
    );
    content = content.replace(
      /const \{ isDark, colors \} = useTheme\(\)/g,
      'const { theme, isDark } = useTheme()'
    );
    content = content.replace(
      /const \{ colors, isDark, setMode \} = useTheme\(\)/g,
      'const { theme, isDark, setMode } = useTheme()'
    );
    content = content.replace(
      /const \{ mode, isDark, colors, setMode \} = useTheme\(\)/g,
      'const { theme, isDark, mode, setMode } = useTheme()'
    );
    changes.push('Заменено colors → theme');
    modified = true;
  }
  
  // 3. Заменяем colors.xxx на theme.xxx
  for (const [from, to] of Object.entries(COLORS_TO_THEME)) {
    const regex = new RegExp(from.replace('.', '\\.'), 'g');
    if (content.includes(from)) {
      content = content.replace(regex, to);
      modified = true;
    }
  }
  
  // 4. Заменяем хардкод цветов
  for (const [color, token] of Object.entries(COLOR_TO_TOKEN)) {
    // Только в стилях (color:, backgroundColor:, borderColor: и т.д.)
    const patterns = [
      new RegExp(`color:\\s*['"]${color}['"]`, 'gi'),
      new RegExp(`backgroundColor:\\s*['"]${color}['"]`, 'gi'),
      new RegExp(`borderColor:\\s*['"]${color}['"]`, 'gi'),
      new RegExp(`borderTopColor:\\s*['"]${color}['"]`, 'gi'),
      new RegExp(`borderBottomColor:\\s*['"]${color}['"]`, 'gi'),
      new RegExp(`borderLeftColor:\\s*['"]${color}['"]`, 'gi'),
      new RegExp(`borderRightColor:\\s*['"]${color}['"]`, 'gi'),
      new RegExp(`tintColor:\\s*['"]${color}['"]`, 'gi'),
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        const propName = pattern.source.split(':')[0].replace(/\\/g, '');
        content = content.replace(pattern, `${propName}: ${token}`);
        changes.push(`Заменён ${color} → ${token}`);
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
console.log('\n🚀 Миграция на новую систему тем...\n');

const files = getAllFiles(SRC_DIR);
let migratedCount = 0;

for (const file of files) {
  const { modified, changes } = migrateFile(file);
  if (modified) {
    const relativePath = path.relative(SRC_DIR, file);
    console.log(`✅ ${relativePath}`);
    changes.forEach(c => console.log(`   - ${c}`));
    migratedCount++;
  }
}

console.log(`\n📊 Мигрировано файлов: ${migratedCount}`);
console.log('\n⚠️  ВАЖНО: Проверьте изменения вручную!');
console.log('   Некоторые цвета могут требовать ручной корректировки.\n');
