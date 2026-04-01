const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../src/screens');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Find StyleSheet.create section
  const styleSheetMatch = content.match(/const styles = StyleSheet\.create\(\{[\s\S]*?\}\);/);
  if (!styleSheetMatch) {
    console.log(`- ${fileName} - no StyleSheet found`);
    return;
  }
  
  const styleSheetSection = styleSheetMatch[0];
  
  // Check if colors.xxx is used in StyleSheet
  if (!styleSheetSection.includes('colors.')) {
    console.log(`- ${fileName} - no colors in StyleSheet`);
    return;
  }
  
  // Replace colors.xxx with hardcoded values in StyleSheet section only
  const colorReplacements = {
    'colors.background': "'#ffffff'",
    'colors.backgroundSecondary': "'#f9fafb'",
    'colors.card': "'#ffffff'",
    'colors.cardBorder': "'#e5e7eb'",
    'colors.text': "'#111827'",
    'colors.textSecondary': "'#6b7280'",
    'colors.textMuted': "'#9ca3af'",
    'colors.primary': "'#2563eb'",
    'colors.primaryLight': "'#dbeafe'",
    'colors.border': "'#e5e7eb'",
    'colors.inputBackground': "'#ffffff'",
    'colors.inputBorder': "'#d1d5db'",
    'colors.success': "'#10b981'",
    'colors.error': "'#ef4444'",
    'colors.warning': "'#f59e0b'",
  };
  
  let fixedStyleSheet = styleSheetSection;
  let changeCount = 0;
  
  for (const [colorVar, hardcoded] of Object.entries(colorReplacements)) {
    const regex = new RegExp(colorVar.replace('.', '\\.'), 'g');
    const matches = fixedStyleSheet.match(regex);
    if (matches) {
      changeCount += matches.length;
      fixedStyleSheet = fixedStyleSheet.replace(regex, hardcoded);
    }
  }
  
  if (changeCount > 0) {
    content = content.replace(styleSheetSection, fixedStyleSheet);
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${fileName} - fixed ${changeCount} colors in StyleSheet`);
  } else {
    console.log(`- ${fileName} - no changes needed`);
  }
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDir(filePath);
    } else if (file.endsWith('.tsx')) {
      fixFile(filePath);
    }
  }
}

console.log('\n=== Fixing StyleSheet colors ===\n');
processDir(screensDir);
console.log('\nDone!');
