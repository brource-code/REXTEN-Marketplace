const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../src/screens/business');
const clientScreensDir = path.join(__dirname, '../src/screens');

const themeImport = "import { useTheme } from '../../contexts/ThemeContext';";
const themeImportClient = "import { useTheme } from '../contexts/ThemeContext';";

function addThemeToFile(filePath, isClientScreen = false) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Skip if already has useTheme
  if (content.includes('useTheme')) {
    console.log(`✓ ${fileName} - already has theme`);
    return;
  }
  
  const importLine = isClientScreen ? themeImportClient : themeImport;
  
  // Find the last import line and add theme import after it
  const importRegex = /^import .+ from ['"].+['"];?\s*$/gm;
  let lastImportMatch;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }
  
  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    content = content.slice(0, insertPos) + '\n' + importLine + content.slice(insertPos);
    
    // Find the function component and add useTheme hook
    // Look for pattern: export function ComponentName() {
    const funcRegex = /export function \w+\([^)]*\)\s*\{/g;
    const funcMatch = funcRegex.exec(content);
    
    if (funcMatch) {
      // Find first useState or useQuery or similar hook
      const hookRegex = /const \[?\w+[\],\s\w]*\]?\s*=\s*use\w+/;
      const afterFunc = content.slice(funcMatch.index + funcMatch[0].length);
      const hookMatch = hookRegex.exec(afterFunc);
      
      if (hookMatch) {
        const insertHookPos = funcMatch.index + funcMatch[0].length + hookMatch.index;
        const colorsLine = '\n  const { colors } = useTheme();\n';
        content = content.slice(0, insertHookPos) + colorsLine + content.slice(insertHookPos);
      }
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${fileName} - theme added`);
  } else {
    console.log(`✗ ${fileName} - no imports found`);
  }
}

// Process business screens
console.log('\n=== Business Screens ===\n');
const businessFiles = fs.readdirSync(screensDir).filter(f => f.endsWith('.tsx'));
businessFiles.forEach(file => {
  addThemeToFile(path.join(screensDir, file), false);
});

// Process client screens
console.log('\n=== Client Screens ===\n');
const clientFiles = fs.readdirSync(clientScreensDir).filter(f => f.endsWith('.tsx') && !f.includes('business'));
clientFiles.forEach(file => {
  addThemeToFile(path.join(clientScreensDir, file), true);
});

console.log('\nDone!');
