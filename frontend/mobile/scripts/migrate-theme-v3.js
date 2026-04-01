#!/usr/bin/env node
/**
 * Скрипт миграции v3 - исправляет оставшийся хардкод в иконках и условиях.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// Маппинг для color= атрибутов в иконках
const ICON_COLOR_MAP = {
  '"#ffffff"': 'theme.buttonText',
  "'#ffffff'": 'theme.buttonText',
  '"#374151"': 'theme.textSecondary',
  "'#374151'": 'theme.textSecondary',
  '"#4b5563"': 'theme.textSecondary',
  "'#4b5563'": 'theme.textSecondary',
  '"#6b7280"': 'theme.textSecondary',
  "'#6b7280'": 'theme.textSecondary',
  '"#9ca3af"': 'theme.textMuted',
  "'#9ca3af'": 'theme.textMuted',
  '"#2563eb"': 'theme.primary',
  "'#2563eb'": 'theme.primary',
  '"#ef4444"': 'theme.error',
  "'#ef4444'": 'theme.error',
  '"#10b981"': 'theme.success',
  "'#10b981'": 'theme.success',
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
  
  if (filePath.includes('/theme/')) {
    return { modified: false, changes: [] };
  }
  
  // Заменяем color="..." и color={'...'} в иконках
  for (const [from, to] of Object.entries(ICON_COLOR_MAP)) {
    // color="..."
    const pattern1 = new RegExp(`color=${from}`, 'g');
    if (pattern1.test(content)) {
      content = content.replace(pattern1, `color={${to}}`);
      changes.push(`color=${from} → ${to}`);
      modified = true;
    }
    
    // color={...}
    const pattern2 = new RegExp(`color=\\{${from}\\}`, 'g');
    if (pattern2.test(content)) {
      content = content.replace(pattern2, `color={${to}}`);
      changes.push(`color={${from}} → ${to}`);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
  }
  
  return { modified, changes: [...new Set(changes)] };
}

// Запуск
console.log('\n🚀 Миграция v3 - иконки и атрибуты...\n');

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

console.log(`\n📊 Мигрировано файлов: ${migratedCount}\n`);
