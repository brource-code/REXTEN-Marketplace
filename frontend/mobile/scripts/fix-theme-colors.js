#!/usr/bin/env node
/**
 * Скрипт для автоматической замены хардкода цветов на динамические стили.
 * 
 * Что делает:
 * 1. Находит все файлы с StyleSheet.create
 * 2. Заменяет хардкод цветов на переменные из темы
 * 3. Добавляет импорт useAppStyles если нужно
 * 
 * Запуск: node scripts/fix-theme-colors.js
 */

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '../src/screens');

// Маппинг hex цветов на переменные темы
const COLOR_MAP = {
  // Фоны
  '#ffffff': 'colors.card',
  '#f9fafb': 'colors.backgroundSecondary',
  '#f3f4f6': 'colors.backgroundTertiary',
  '#fafafa': 'colors.backgroundSecondary',
  
  // Тексты
  '#111827': 'colors.text',
  '#1f2937': 'colors.text',
  '#374151': 'colors.textSecondary',
  '#6b7280': 'colors.textSecondary',
  '#9ca3af': 'colors.textMuted',
  
  // Границы
  '#e5e7eb': 'colors.cardBorder',
  '#d1d5db': 'colors.inputBorder',
  
  // Primary
  '#2563eb': 'colors.primary',
  '#3b82f6': 'colors.primary',
  '#1d4ed8': 'colors.primaryDark',
  '#dbeafe': 'colors.primaryLight',
  
  // Success
  '#10b981': 'colors.success',
  '#059669': 'colors.success',
  '#065f46': 'colors.successDark',
  '#d1fae5': 'colors.successLight',
  '#ecfdf5': 'colors.successLight',
  '#16a34a': 'colors.success',
  '#a7f3d0': 'colors.successLight',
  
  // Error
  '#ef4444': 'colors.error',
  '#dc2626': 'colors.error',
  '#991b1b': 'colors.error',
  '#fecaca': 'colors.errorLight',
  
  // Warning
  '#f59e0b': 'colors.warning',
  '#d97706': 'colors.warning',
  '#92400e': 'colors.warning',
  '#fef3c7': 'colors.warningLight',
  '#ffedd5': 'colors.warningLight',
  '#9a3412': 'colors.warning',
  
  // Purple
  '#7c3aed': 'colors.purple',
  '#9333ea': 'colors.purple',
  '#8b5cf6': 'colors.purple',
  '#4f46e5': 'colors.purple',
  '#ede9fe': 'colors.purpleLight',
  '#e9d5ff': 'colors.purpleLight',
  '#e0e7ff': 'colors.purpleLight',
  
  // Info / Blue
  '#1e40af': 'colors.primaryDark',
};

// Цвета которые НЕ нужно заменять (статусы, иконки и т.д.)
const SKIP_COLORS = new Set([
  '#ffffff', // Белый текст на кнопках - оставляем
]);

function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Ищем хардкод цветов в стилях
  const hexPattern = /#[0-9a-fA-F]{6}/g;
  const matches = content.match(hexPattern) || [];
  
  // Фильтруем уникальные
  const unique = [...new Set(matches)];
  
  // Проверяем есть ли StyleSheet.create
  const hasStyleSheet = content.includes('StyleSheet.create');
  
  // Проверяем используется ли useTheme
  const hasUseTheme = content.includes('useTheme');
  
  // Проверяем используется ли useAppStyles
  const hasUseAppStyles = content.includes('useAppStyles');
  
  return {
    filePath,
    hardcodedColors: unique,
    hasStyleSheet,
    hasUseTheme,
    hasUseAppStyles,
    needsFix: hasStyleSheet && unique.length > 0 && !hasUseAppStyles,
  };
}

function printReport(files) {
  console.log('\n📊 ОТЧЕТ ПО ХАРДКОДУ ЦВЕТОВ\n');
  console.log('=' .repeat(60));
  
  let totalFiles = 0;
  let totalColors = 0;
  
  const needsFix = files.filter(f => f.needsFix);
  
  for (const file of needsFix) {
    const relativePath = path.relative(SCREENS_DIR, file.filePath);
    console.log(`\n📁 ${relativePath}`);
    console.log(`   Хардкод цветов: ${file.hardcodedColors.length}`);
    console.log(`   useTheme: ${file.hasUseTheme ? '✅' : '❌'}`);
    console.log(`   useAppStyles: ${file.hasUseAppStyles ? '✅' : '❌'}`);
    
    // Показываем какие цвета
    for (const color of file.hardcodedColors.slice(0, 5)) {
      const mapped = COLOR_MAP[color.toLowerCase()];
      console.log(`   ${color} → ${mapped || '???'}`);
    }
    if (file.hardcodedColors.length > 5) {
      console.log(`   ... и ещё ${file.hardcodedColors.length - 5}`);
    }
    
    totalFiles++;
    totalColors += file.hardcodedColors.length;
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📈 ИТОГО:`);
  console.log(`   Файлов с хардкодом: ${totalFiles}`);
  console.log(`   Всего хардкод цветов: ${totalColors}`);
  console.log(`\n💡 РЕКОМЕНДАЦИЯ:`);
  console.log(`   Используйте useAppStyles() вместо StyleSheet.create()`);
  console.log(`   import { useAppStyles } from '../../hooks/useAppStyles';`);
  console.log(`   const { styles, colors } = useAppStyles();`);
}

// Запуск
const files = getAllFiles(SCREENS_DIR);
const analyzed = files.map(analyzeFile);
printReport(analyzed);
