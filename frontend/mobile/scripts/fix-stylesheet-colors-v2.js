const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../src/screens');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Fix broken replacements like '#ffffff'Secondary -> '#f9fafb'
  const brokenReplacements = [
    { pattern: /'#ffffff'Secondary/g, replacement: "'#f9fafb'" },
    { pattern: /'#ffffff'Border/g, replacement: "'#e5e7eb'" },
    { pattern: /'#111827'Secondary/g, replacement: "'#6b7280'" },
    { pattern: /'#111827'Muted/g, replacement: "'#9ca3af'" },
    { pattern: /'#2563eb'Light/g, replacement: "'#dbeafe'" },
    { pattern: /'#e5e7eb'Border/g, replacement: "'#e5e7eb'" },
  ];
  
  let changeCount = 0;
  
  brokenReplacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(pattern, replacement);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${fileName} - fixed ${changeCount} broken replacements`);
  } else {
    console.log(`- ${fileName} - no broken replacements`);
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

console.log('\n=== Fixing broken color replacements ===\n');
processDir(screensDir);
console.log('\nDone!');
