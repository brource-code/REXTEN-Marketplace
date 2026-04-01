#!/usr/bin/env node
/**
 * Скрипт для исправления файлов, где theme используется в StyleSheet.create
 * Заменяет на динамические стили через useMemo
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/components/LocationSelector.tsx',
  'src/components/EmptyState.tsx',
  'src/components/ErrorState.tsx',
  'src/components/RatingBadge.tsx',
  'src/components/ServiceCard.tsx',
  'src/components/SwipeActionsRow.tsx',
];

const baseDir = path.join(__dirname, '..');

filesToFix.forEach(filePath => {
  const fullPath = path.join(baseDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Файл не найден: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Проверяем, есть ли уже useTheme импорт
  if (!content.includes("import { useTheme }") && !content.includes("from '../../theme'") && !content.includes("from '../theme'")) {
    // Добавляем импорт useTheme
    const importMatch = content.match(/^(import .+ from ['"].+['"];?\n)+/m);
    if (importMatch) {
      const lastImport = importMatch[0];
      const themePath = filePath.includes('/components/business/') ? '../../theme' : '../theme';
      content = content.replace(lastImport, lastImport + `import { useTheme } from '${themePath}';\n`);
    }
  }
  
  // Заменяем опечатки в названиях свойств стилей
  content = content.replace(/backgroundcolor:/g, 'backgroundColor:');
  content = content.replace(/bordercolor:/g, 'borderColor:');
  content = content.replace(/borderTopcolor:/g, 'borderTopColor:');
  content = content.replace(/borderBottomcolor:/g, 'borderBottomColor:');
  content = content.replace(/bgcolor:/g, 'bgColor:');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Исправлен: ${filePath}`);
});

console.log('\nГотово!');
