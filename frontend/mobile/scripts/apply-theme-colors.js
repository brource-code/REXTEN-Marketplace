const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../src/screens/business');
const clientScreensDir = path.join(__dirname, '../src/screens');

// Color replacements in JSX (not in StyleSheet)
const colorReplacements = [
  // Background colors
  { pattern: /backgroundColor: ['"]#ffffff['"]/g, replacement: 'backgroundColor: colors.background' },
  { pattern: /backgroundColor: ['"]#f9fafb['"]/g, replacement: 'backgroundColor: colors.backgroundSecondary' },
  { pattern: /backgroundColor: ['"]#f3f4f6['"]/g, replacement: 'backgroundColor: colors.backgroundSecondary' },
  
  // Text colors
  { pattern: /color: ['"]#111827['"]/g, replacement: 'color: colors.text' },
  { pattern: /color: ['"]#374151['"]/g, replacement: 'color: colors.text' },
  { pattern: /color: ['"]#6b7280['"]/g, replacement: 'color: colors.textSecondary' },
  { pattern: /color: ['"]#9ca3af['"]/g, replacement: 'color: colors.textMuted' },
  { pattern: /color: ['"]#4b5563['"]/g, replacement: 'color: colors.textSecondary' },
  
  // Border colors
  { pattern: /borderColor: ['"]#e5e7eb['"]/g, replacement: 'borderColor: colors.cardBorder' },
  { pattern: /borderTopColor: ['"]#e5e7eb['"]/g, replacement: 'borderTopColor: colors.border' },
  { pattern: /borderTopColor: ['"]#f3f4f6['"]/g, replacement: 'borderTopColor: colors.border' },
  { pattern: /borderBottomColor: ['"]#e5e7eb['"]/g, replacement: 'borderBottomColor: colors.border' },
  { pattern: /borderBottomColor: ['"]#f3f4f6['"]/g, replacement: 'borderBottomColor: colors.border' },
  { pattern: /borderRightColor: ['"]#e5e7eb['"]/g, replacement: 'borderRightColor: colors.border' },
  { pattern: /borderRightColor: ['"]#f3f4f6['"]/g, replacement: 'borderRightColor: colors.border' },
  
  // Primary colors
  { pattern: /color: ['"]#2563eb['"]/g, replacement: 'color: colors.primary' },
  { pattern: /color: ['"]#1d4ed8['"]/g, replacement: 'color: colors.primary' },
  { pattern: /backgroundColor: ['"]#dbeafe['"]/g, replacement: 'backgroundColor: colors.primaryLight' },
  { pattern: /backgroundColor: ['"]#eff6ff['"]/g, replacement: 'backgroundColor: colors.primaryLight' },
  { pattern: /borderColor: ['"]#93c5fd['"]/g, replacement: 'borderColor: colors.primary' },
  
  // Ionicons color props
  { pattern: /color=["']#6b7280["']/g, replacement: 'color={colors.textSecondary}' },
  { pattern: /color=["']#9ca3af["']/g, replacement: 'color={colors.textMuted}' },
  { pattern: /color=["']#2563eb["']/g, replacement: 'color={colors.primary}' },
  { pattern: /color=["']#d1d5db["']/g, replacement: 'color={colors.textMuted}' },
  { pattern: /color=["']#111827["']/g, replacement: 'color={colors.text}' },
  
  // tintColor for RefreshControl
  { pattern: /tintColor=["']#2563eb["']/g, replacement: 'tintColor={colors.primary}' },
  
  // placeholderTextColor
  { pattern: /placeholderTextColor=["']#9ca3af["']/g, replacement: 'placeholderTextColor={colors.textMuted}' },
  { pattern: /placeholderTextColor=["']#9CA3AF["']/g, replacement: 'placeholderTextColor={colors.textMuted}' },
];

function applyThemeColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Skip if doesn't have useTheme
  if (!content.includes('useTheme')) {
    console.log(`✗ ${fileName} - no useTheme`);
    return;
  }
  
  let changeCount = 0;
  
  colorReplacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(pattern, replacement);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${fileName} - ${changeCount} replacements`);
  } else {
    console.log(`- ${fileName} - no changes needed`);
  }
}

// Process business screens
console.log('\n=== Business Screens ===\n');
const businessFiles = fs.readdirSync(screensDir).filter(f => f.endsWith('.tsx'));
businessFiles.forEach(file => {
  applyThemeColors(path.join(screensDir, file));
});

// Process client screens
console.log('\n=== Client Screens ===\n');
const clientFiles = fs.readdirSync(clientScreensDir).filter(f => f.endsWith('.tsx') && !f.includes('business'));
clientFiles.forEach(file => {
  applyThemeColors(path.join(clientScreensDir, file));
});

console.log('\nDone!');
