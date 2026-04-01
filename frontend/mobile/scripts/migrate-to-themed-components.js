#!/usr/bin/env node
/**
 * Скрипт миграции на тематические компоненты.
 * 
 * Что делает:
 * 1. Анализирует все файлы экранов
 * 2. Показывает статистику хардкода
 * 3. Генерирует отчёт о необходимых изменениях
 * 
 * Запуск: node scripts/migrate-to-themed-components.js
 */

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '../src/screens');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');

// Цвета которые нужно заменить
const HARDCODED_COLORS = [
  '#ffffff', '#fff',
  '#000000', '#000',
  '#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af',
  '#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db',
  '#2563eb', '#3b82f6', '#1d4ed8', '#dbeafe',
  '#10b981', '#059669', '#065f46', '#d1fae5', '#ecfdf5',
  '#ef4444', '#dc2626', '#991b1b', '#fecaca', '#fee2e2',
  '#f59e0b', '#d97706', '#92400e', '#fef3c7', '#ffedd5',
  '#7c3aed', '#9333ea', '#8b5cf6', '#4f46e5', '#ede9fe', '#e9d5ff',
];

function getAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
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
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  
  const issues = [];
  
  // Ищем хардкод цветов
  const hexPattern = /#[0-9a-fA-F]{3,6}\b/gi;
  const matches = content.match(hexPattern) || [];
  const uniqueColors = [...new Set(matches.map(c => c.toLowerCase()))];
  
  if (uniqueColors.length > 0) {
    issues.push({
      type: 'hardcoded_colors',
      count: matches.length,
      unique: uniqueColors.length,
      colors: uniqueColors.slice(0, 10),
    });
  }
  
  // Ищем isDark ? условия
  const isDarkPattern = /isDark\s*\?/g;
  const isDarkMatches = content.match(isDarkPattern) || [];
  if (isDarkMatches.length > 0) {
    issues.push({
      type: 'isDark_ternary',
      count: isDarkMatches.length,
    });
  }
  
  // Проверяем использование StyleSheet.create
  const hasStyleSheet = content.includes('StyleSheet.create');
  if (hasStyleSheet) {
    issues.push({
      type: 'static_stylesheet',
      message: 'Использует статический StyleSheet.create',
    });
  }
  
  // Проверяем использование useAppStyles
  const hasUseAppStyles = content.includes('useAppStyles');
  
  // Проверяем использование UI компонентов
  const hasThemedText = content.includes('ThemedText');
  const hasScreen = content.includes("from '../../components/ui'") || 
                    content.includes("from '../components/ui'");
  
  return {
    filePath: relativePath,
    issues,
    hasStyleSheet,
    hasUseAppStyles,
    hasThemedComponents: hasThemedText || hasScreen,
    needsMigration: issues.length > 0 && !hasUseAppStyles,
  };
}

function printReport(files) {
  console.log('\n' + '═'.repeat(70));
  console.log('  📊 ОТЧЁТ ПО МИГРАЦИИ НА ТЕМАТИЧЕСКИЕ КОМПОНЕНТЫ');
  console.log('═'.repeat(70));
  
  const needsMigration = files.filter(f => f.needsMigration);
  const alreadyMigrated = files.filter(f => f.hasUseAppStyles || f.hasThemedComponents);
  
  console.log(`\n📁 Всего файлов проанализировано: ${files.length}`);
  console.log(`✅ Уже используют тему: ${alreadyMigrated.length}`);
  console.log(`❌ Требуют миграции: ${needsMigration.length}`);
  
  if (needsMigration.length > 0) {
    console.log('\n' + '─'.repeat(70));
    console.log('  ❌ ФАЙЛЫ ТРЕБУЮЩИЕ МИГРАЦИИ:');
    console.log('─'.repeat(70));
    
    let totalColors = 0;
    let totalIsDark = 0;
    
    for (const file of needsMigration) {
      console.log(`\n📄 ${file.filePath}`);
      
      for (const issue of file.issues) {
        if (issue.type === 'hardcoded_colors') {
          console.log(`   🎨 Хардкод цветов: ${issue.count} (${issue.unique} уникальных)`);
          console.log(`      ${issue.colors.join(', ')}${issue.unique > 10 ? '...' : ''}`);
          totalColors += issue.count;
        }
        if (issue.type === 'isDark_ternary') {
          console.log(`   ⚠️  isDark ? условий: ${issue.count}`);
          totalIsDark += issue.count;
        }
        if (issue.type === 'static_stylesheet') {
          console.log(`   📝 ${issue.message}`);
        }
      }
    }
    
    console.log('\n' + '─'.repeat(70));
    console.log('  📈 ИТОГО:');
    console.log('─'.repeat(70));
    console.log(`   🎨 Хардкод цветов: ${totalColors}`);
    console.log(`   ⚠️  isDark ? условий: ${totalIsDark}`);
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('  💡 РЕКОМЕНДАЦИИ:');
  console.log('═'.repeat(70));
  console.log(`
  1. Используйте компоненты из ui/:
     import { Screen, ThemedText, Card, Button } from '../../components/ui';

  2. Вместо <Text style={{ color: '#111827' }}>:
     <ThemedText>Текст</ThemedText>
     <ThemedText color="secondary">Вторичный текст</ThemedText>

  3. Вместо <View style={{ backgroundColor: '#ffffff' }}>:
     <ThemedView variant="card">Контент</ThemedView>

  4. Вместо StyleSheet.create с хардкодом:
     const { styles, colors } = useAppStyles();

  5. Вместо isDark ? '#fff' : '#000':
     colors.text (автоматически меняется)
`);
  console.log('═'.repeat(70) + '\n');
}

// Запуск
const screenFiles = getAllFiles(SCREENS_DIR);
const componentFiles = getAllFiles(COMPONENTS_DIR);
const allFiles = [...screenFiles, ...componentFiles];

const analyzed = allFiles.map(analyzeFile);
printReport(analyzed);
