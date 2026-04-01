const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../src/screens');

const replacements = [
  // Headers and containers
  { 
    pattern: /style=\{styles\.headerFixed\}/g, 
    replacement: 'style={[styles.headerFixed, { backgroundColor: colors.background, borderBottomColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.header\}(?!\])/g, 
    replacement: 'style={[styles.header, { backgroundColor: colors.background }]}' 
  },
  
  // Page titles and descriptions
  { 
    pattern: /style=\{styles\.pageTitle\}(?!\])/g, 
    replacement: 'style={[styles.pageTitle, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.pageDesc\}(?!\])/g, 
    replacement: 'style={[styles.pageDesc, { color: colors.textSecondary }]}' 
  },
  
  // Cards
  { 
    pattern: /style=\{styles\.card\}(?!\])/g, 
    replacement: 'style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  
  // Stat cards
  { 
    pattern: /style=\{styles\.statCard\}(?!\])/g, 
    replacement: 'style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.statLabel\}(?!\])/g, 
    replacement: 'style={[styles.statLabel, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.statValue\}(?!\])/g, 
    replacement: 'style={[styles.statValue, { color: colors.text }]}' 
  },
  
  // Filter chips
  { 
    pattern: /style=\{\[styles\.filterChip, statusFilter === f && styles\.filterChipActive\]\}/g, 
    replacement: 'style={[styles.filterChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }, statusFilter === f && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}' 
  },
  { 
    pattern: /style=\{\[styles\.filterChipText, statusFilter === f && styles\.filterChipTextActive\]\}/g, 
    replacement: 'style={[styles.filterChipText, { color: colors.textSecondary }, statusFilter === f && { color: colors.primary }]}' 
  },
  
  // Count text
  { 
    pattern: /style=\{styles\.countText\}(?!\])/g, 
    replacement: 'style={[styles.countText, { color: colors.textSecondary }]}' 
  },
  
  // Empty state
  { 
    pattern: /style=\{styles\.emptyText\}(?!\])/g, 
    replacement: 'style={[styles.emptyText, { color: colors.textSecondary }]}' 
  },
  
  // Card content elements
  { 
    pattern: /style=\{styles\.cardTitle\}(?!\])/g, 
    replacement: 'style={[styles.cardTitle, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.cardSubtitle\}(?!\])/g, 
    replacement: 'style={[styles.cardSubtitle, { color: colors.textSecondary }]}' 
  },
  
  // Card actions
  { 
    pattern: /style=\{styles\.cardActions\}(?!\])/g, 
    replacement: 'style={[styles.cardActions, { borderTopColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.actionBtn\}(?!\])/g, 
    replacement: 'style={[styles.actionBtn, { borderRightColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.actionBtnText\}(?!\])/g, 
    replacement: 'style={[styles.actionBtnText, { color: colors.primary }]}' 
  },
  
  // Search
  { 
    pattern: /style=\{styles\.searchWrap\}(?!\])/g, 
    replacement: 'style={[styles.searchWrap, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.searchInput\}(?!\])/g, 
    replacement: 'style={[styles.searchInput, { color: colors.text }]}' 
  },
  
  // Modal
  { 
    pattern: /style=\{styles\.modalContainer\}(?!\])/g, 
    replacement: 'style={[styles.modalContainer, { backgroundColor: colors.background }]}' 
  },
  { 
    pattern: /style=\{styles\.modalHeader\}(?!\])/g, 
    replacement: 'style={[styles.modalHeader, { borderBottomColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.modalTitle\}(?!\])/g, 
    replacement: 'style={[styles.modalTitle, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.modalFooter\}(?!\])/g, 
    replacement: 'style={[styles.modalFooter, { borderTopColor: colors.border }]}' 
  },
  
  // Form elements
  { 
    pattern: /style=\{styles\.formLabel\}(?!\])/g, 
    replacement: 'style={[styles.formLabel, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.formInput\}(?!\])/g, 
    replacement: 'style={[styles.formInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.input\}(?!\])/g, 
    replacement: 'style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}' 
  },
  
  // Section titles
  { 
    pattern: /style=\{styles\.sectionTitle\}(?!\])/g, 
    replacement: 'style={[styles.sectionTitle, { color: colors.textSecondary }]}' 
  },
  
  // Labels and values
  { 
    pattern: /style=\{styles\.label\}(?!\])/g, 
    replacement: 'style={[styles.label, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.value\}(?!\])/g, 
    replacement: 'style={[styles.value, { color: colors.text }]}' 
  },
  
  // Menu items
  { 
    pattern: /style=\{styles\.menuItem\}(?!\])/g, 
    replacement: 'style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.menuLabel\}(?!\])/g, 
    replacement: 'style={[styles.menuLabel, { color: colors.text }]}' 
  },
  
  // Rows with borders
  { 
    pattern: /style=\{styles\.row\}(?!\])/g, 
    replacement: 'style={[styles.row, { borderBottomColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.settingRow\}(?!\])/g, 
    replacement: 'style={[styles.settingRow, { borderBottomColor: colors.border }]}' 
  },
  
  // Title and name
  { 
    pattern: /style=\{styles\.title\}(?!\])/g, 
    replacement: 'style={[styles.title, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.name\}(?!\])/g, 
    replacement: 'style={[styles.name, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.subtitle\}(?!\])/g, 
    replacement: 'style={[styles.subtitle, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.description\}(?!\])/g, 
    replacement: 'style={[styles.description, { color: colors.textSecondary }]}' 
  },
  
  // Error text
  { 
    pattern: /style=\{styles\.errorText\}(?!\])/g, 
    replacement: 'style={[styles.errorText, { color: colors.error }]}' 
  },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Skip if no useTheme
  if (!content.includes('useTheme')) {
    console.log(`✗ ${fileName} - no useTheme`);
    return;
  }
  
  let changeCount = 0;
  
  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(pattern, replacement);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${fileName} - ${changeCount} dynamic styles added`);
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
      processFile(filePath);
    }
  }
}

console.log('\n=== Adding dynamic styles ===\n');
processDir(screensDir);
console.log('\nDone!');
