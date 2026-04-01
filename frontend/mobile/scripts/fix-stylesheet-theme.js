#!/usr/bin/env node
/**
 * Скрипт для исправления файлов, где theme используется в StyleSheet.create
 * Заменяет theme.xxx на пустые значения (цвета будут применяться динамически)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const baseDir = path.join(__dirname, '..');

// Найти все .tsx файлы
const files = glob.sync('src/**/*.tsx', { cwd: baseDir });

let fixedCount = 0;

files.forEach(filePath => {
  const fullPath = path.join(baseDir, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Проверяем, есть ли StyleSheet.create с theme.xxx
  const stylesheetMatch = content.match(/const styles = StyleSheet\.create\(\{[\s\S]*?\}\);/);
  if (!stylesheetMatch) return;
  
  const stylesheetBlock = stylesheetMatch[0];
  
  // Проверяем, есть ли theme.xxx в StyleSheet
  if (!stylesheetBlock.includes('theme.')) return;
  
  // Заменяем theme.xxx на placeholder значения
  let newStylesheet = stylesheetBlock
    // Удаляем свойства с theme.xxx (цвета будут применяться inline)
    .replace(/,?\s*(backgroundColor|borderColor|borderTopColor|borderBottomColor|shadowColor|color):\s*theme\.[a-zA-Z]+,?/g, '')
    // Исправляем опечатки
    .replace(/backgroundcolor:/gi, 'backgroundColor:')
    .replace(/bordercolor:/gi, 'borderColor:')
    .replace(/borderTopcolor:/gi, 'borderTopColor:')
    .replace(/borderBottomcolor:/gi, 'borderBottomColor:')
    .replace(/shadowcolor:/gi, 'shadowColor:')
    // Удаляем пустые объекты
    .replace(/\{\s*,\s*\}/g, '{}')
    .replace(/,\s*,/g, ',')
    .replace(/\{\s*,/g, '{')
    .replace(/,\s*\}/g, '}');
  
  if (newStylesheet !== stylesheetBlock) {
    content = content.replace(stylesheetBlock, newStylesheet);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    fixedCount++;
    console.log(`Исправлен: ${filePath}`);
  }
});

console.log(`\nИсправлено файлов: ${fixedCount}`);
