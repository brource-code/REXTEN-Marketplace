const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../src/screens');

const replacements = [
  // Stats
  { 
    pattern: /style=\{styles\.statsRow\}(?!\])/g, 
    replacement: 'style={[styles.statsRow, { backgroundColor: colors.background }]}' 
  },
  { 
    pattern: /style=\{styles\.statMini\}(?!\])/g, 
    replacement: 'style={[styles.statMini, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.statTitle\}(?!\])/g, 
    replacement: 'style={[styles.statTitle, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.statSubValue\}(?!\])/g, 
    replacement: 'style={[styles.statSubValue, { color: colors.textSecondary }]}' 
  },
  
  // Inputs and text areas
  { 
    pattern: /style=\{styles\.textArea\}(?!\])/g, 
    replacement: 'style={[styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.inputRow\}(?!\])/g, 
    replacement: 'style={[styles.inputRow, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}' 
  },
  
  // Sections
  { 
    pattern: /style=\{styles\.section\}(?!\])/g, 
    replacement: 'style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.sectionHeader\}(?!\])/g, 
    replacement: 'style={[styles.sectionHeader, { borderBottomColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.sectionContent\}(?!\])/g, 
    replacement: 'style={[styles.sectionContent, { backgroundColor: colors.card }]}' 
  },
  
  // Blocks
  { 
    pattern: /style=\{styles\.block\}(?!\])/g, 
    replacement: 'style={[styles.block, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.infoBlock\}(?!\])/g, 
    replacement: 'style={[styles.infoBlock, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  
  // Containers
  { 
    pattern: /style=\{styles\.container\}(?!\])/g, 
    replacement: 'style={[styles.container, { backgroundColor: colors.background }]}' 
  },
  { 
    pattern: /style=\{styles\.content\}(?!\])/g, 
    replacement: 'style={[styles.content, { backgroundColor: colors.background }]}' 
  },
  { 
    pattern: /style=\{styles\.scrollContent\}(?!\])/g, 
    replacement: 'style={[styles.scrollContent, { backgroundColor: colors.background }]}' 
  },
  
  // Items and rows
  { 
    pattern: /style=\{styles\.item\}(?!\])/g, 
    replacement: 'style={[styles.item, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.itemRow\}(?!\])/g, 
    replacement: 'style={[styles.itemRow, { borderBottomColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.listItem\}(?!\])/g, 
    replacement: 'style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  
  // Booking and service cards
  { 
    pattern: /style=\{styles\.bookingCard\}(?!\])/g, 
    replacement: 'style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.serviceCard\}(?!\])/g, 
    replacement: 'style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.reviewCard\}(?!\])/g, 
    replacement: 'style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  
  // Buttons
  { 
    pattern: /style=\{styles\.cancelBtn\}(?!\])/g, 
    replacement: 'style={[styles.cancelBtn, { backgroundColor: colors.backgroundSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.cancelBtnText\}(?!\])/g, 
    replacement: 'style={[styles.cancelBtnText, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.secondaryBtn\}(?!\])/g, 
    replacement: 'style={[styles.secondaryBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.secondaryBtnText\}(?!\])/g, 
    replacement: 'style={[styles.secondaryBtnText, { color: colors.text }]}' 
  },
  
  // Options
  { 
    pattern: /style=\{styles\.optionBtn\}(?!\])/g, 
    replacement: 'style={[styles.optionBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.optionBtnActive\}(?!\])/g, 
    replacement: 'style={[styles.optionBtnActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}' 
  },
  { 
    pattern: /style=\{styles\.optionText\}(?!\])/g, 
    replacement: 'style={[styles.optionText, { color: colors.text }]}' 
  },
  
  // Tabs
  { 
    pattern: /style=\{styles\.tabBar\}(?!\])/g, 
    replacement: 'style={[styles.tabBar, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.tab\}(?!\])/g, 
    replacement: 'style={[styles.tab, { backgroundColor: colors.backgroundSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.tabActive\}(?!\])/g, 
    replacement: 'style={[styles.tabActive, { backgroundColor: colors.card }]}' 
  },
  { 
    pattern: /style=\{styles\.tabText\}(?!\])/g, 
    replacement: 'style={[styles.tabText, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.tabTextActive\}(?!\])/g, 
    replacement: 'style={[styles.tabTextActive, { color: colors.text }]}' 
  },
  
  // Chips and tags
  { 
    pattern: /style=\{styles\.chip\}(?!\])/g, 
    replacement: 'style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.chipActive\}(?!\])/g, 
    replacement: 'style={[styles.chipActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}' 
  },
  { 
    pattern: /style=\{styles\.chipText\}(?!\])/g, 
    replacement: 'style={[styles.chipText, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.chipTextActive\}(?!\])/g, 
    replacement: 'style={[styles.chipTextActive, { color: colors.primary }]}' 
  },
  { 
    pattern: /style=\{styles\.tag\}(?!\])/g, 
    replacement: 'style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.tagText\}(?!\])/g, 
    replacement: 'style={[styles.tagText, { color: colors.textSecondary }]}' 
  },
  
  // Avatar
  { 
    pattern: /style=\{styles\.avatar\}(?!\])/g, 
    replacement: 'style={[styles.avatar, { backgroundColor: colors.primaryLight }]}' 
  },
  { 
    pattern: /style=\{styles\.avatarText\}(?!\])/g, 
    replacement: 'style={[styles.avatarText, { color: colors.primary }]}' 
  },
  
  // Thumb/image placeholders
  { 
    pattern: /style=\{styles\.thumb\}(?!\])/g, 
    replacement: 'style={[styles.thumb, { backgroundColor: colors.backgroundSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.imagePlaceholder\}(?!\])/g, 
    replacement: 'style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}' 
  },
  
  // Info rows
  { 
    pattern: /style=\{styles\.infoRow\}(?!\])/g, 
    replacement: 'style={[styles.infoRow, { borderBottomColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.infoLabel\}(?!\])/g, 
    replacement: 'style={[styles.infoLabel, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.infoValue\}(?!\])/g, 
    replacement: 'style={[styles.infoValue, { color: colors.text }]}' 
  },
  
  // Dividers
  { 
    pattern: /style=\{styles\.divider\}(?!\])/g, 
    replacement: 'style={[styles.divider, { backgroundColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.separator\}(?!\])/g, 
    replacement: 'style={[styles.separator, { backgroundColor: colors.border }]}' 
  },
  
  // Picker/select
  { 
    pattern: /style=\{styles\.picker\}(?!\])/g, 
    replacement: 'style={[styles.picker, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.pickerText\}(?!\])/g, 
    replacement: 'style={[styles.pickerText, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.select\}(?!\])/g, 
    replacement: 'style={[styles.select, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.selectText\}(?!\])/g, 
    replacement: 'style={[styles.selectText, { color: colors.text }]}' 
  },
  
  // Date/time slots
  { 
    pattern: /style=\{styles\.dateSlot\}(?!\])/g, 
    replacement: 'style={[styles.dateSlot, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.timeSlot\}(?!\])/g, 
    replacement: 'style={[styles.timeSlot, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.slotText\}(?!\])/g, 
    replacement: 'style={[styles.slotText, { color: colors.text }]}' 
  },
  
  // Notes
  { 
    pattern: /style=\{styles\.noteCard\}(?!\])/g, 
    replacement: 'style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.noteText\}(?!\])/g, 
    replacement: 'style={[styles.noteText, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.noteDate\}(?!\])/g, 
    replacement: 'style={[styles.noteDate, { color: colors.textSecondary }]}' 
  },
  
  // Summary
  { 
    pattern: /style=\{styles\.summaryRow\}(?!\])/g, 
    replacement: 'style={[styles.summaryRow, { borderBottomColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.summaryLabel\}(?!\])/g, 
    replacement: 'style={[styles.summaryLabel, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.summaryValue\}(?!\])/g, 
    replacement: 'style={[styles.summaryValue, { color: colors.text }]}' 
  },
  
  // Period chips
  { 
    pattern: /style=\{styles\.periodChip\}(?!\])/g, 
    replacement: 'style={[styles.periodChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.periodChipActive\}(?!\])/g, 
    replacement: 'style={[styles.periodChipActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}' 
  },
  { 
    pattern: /style=\{styles\.periodChipText\}(?!\])/g, 
    replacement: 'style={[styles.periodChipText, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.periodChipTextActive\}(?!\])/g, 
    replacement: 'style={[styles.periodChipTextActive, { color: colors.primary }]}' 
  },
  
  // Date picker
  { 
    pattern: /style=\{styles\.dateBtn\}(?!\])/g, 
    replacement: 'style={[styles.dateBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.dateBtnText\}(?!\])/g, 
    replacement: 'style={[styles.dateBtnText, { color: colors.text }]}' 
  },
  
  // Report cards
  { 
    pattern: /style=\{styles\.reportCard\}(?!\])/g, 
    replacement: 'style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.reportTitle\}(?!\])/g, 
    replacement: 'style={[styles.reportTitle, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.reportValue\}(?!\])/g, 
    replacement: 'style={[styles.reportValue, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.reportLabel\}(?!\])/g, 
    replacement: 'style={[styles.reportLabel, { color: colors.textSecondary }]}' 
  },
  
  // Meta info
  { 
    pattern: /style=\{styles\.metaText\}(?!\])/g, 
    replacement: 'style={[styles.metaText, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.metaValue\}(?!\])/g, 
    replacement: 'style={[styles.metaValue, { color: colors.text }]}' 
  },
  
  // Booking meta
  { 
    pattern: /style=\{styles\.bookingMeta\}(?!\])/g, 
    replacement: 'style={[styles.bookingMeta, { borderTopColor: colors.border }]}' 
  },
  { 
    pattern: /style=\{styles\.bookingMetaText\}(?!\])/g, 
    replacement: 'style={[styles.bookingMetaText, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.bookingService\}(?!\])/g, 
    replacement: 'style={[styles.bookingService, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.bookingPrice\}(?!\])/g, 
    replacement: 'style={[styles.bookingPrice, { color: colors.text }]}' 
  },
  
  // Client info
  { 
    pattern: /style=\{styles\.clientName\}(?!\])/g, 
    replacement: 'style={[styles.clientName, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.clientEmail\}(?!\])/g, 
    replacement: 'style={[styles.clientEmail, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.clientPhone\}(?!\])/g, 
    replacement: 'style={[styles.clientPhone, { color: colors.text }]}' 
  },
  
  // Service info
  { 
    pattern: /style=\{styles\.serviceName\}(?!\])/g, 
    replacement: 'style={[styles.serviceName, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.servicePrice\}(?!\])/g, 
    replacement: 'style={[styles.servicePrice, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.serviceDuration\}(?!\])/g, 
    replacement: 'style={[styles.serviceDuration, { color: colors.textSecondary }]}' 
  },
  
  // Specialist
  { 
    pattern: /style=\{styles\.specialistName\}(?!\])/g, 
    replacement: 'style={[styles.specialistName, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.specialistRole\}(?!\])/g, 
    replacement: 'style={[styles.specialistRole, { color: colors.textSecondary }]}' 
  },
  
  // Member card
  { 
    pattern: /style=\{styles\.memberCard\}(?!\])/g, 
    replacement: 'style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.memberName\}(?!\])/g, 
    replacement: 'style={[styles.memberName, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.memberEmail\}(?!\])/g, 
    replacement: 'style={[styles.memberEmail, { color: colors.textSecondary }]}' 
  },
  
  // Role card
  { 
    pattern: /style=\{styles\.roleCard\}(?!\])/g, 
    replacement: 'style={[styles.roleCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.roleName\}(?!\])/g, 
    replacement: 'style={[styles.roleName, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.roleSlug\}(?!\])/g, 
    replacement: 'style={[styles.roleSlug, { color: colors.textSecondary }]}' 
  },
  
  // Discount card
  { 
    pattern: /style=\{styles\.discountCard\}(?!\])/g, 
    replacement: 'style={[styles.discountCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.discountName\}(?!\])/g, 
    replacement: 'style={[styles.discountName, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.discountValue\}(?!\])/g, 
    replacement: 'style={[styles.discountValue, { color: colors.text }]}' 
  },
  
  // Portfolio
  { 
    pattern: /style=\{styles\.portfolioCard\}(?!\])/g, 
    replacement: 'style={[styles.portfolioCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.portfolioTitle\}(?!\])/g, 
    replacement: 'style={[styles.portfolioTitle, { color: colors.text }]}' 
  },
  
  // Notification
  { 
    pattern: /style=\{styles\.notificationCard\}(?!\])/g, 
    replacement: 'style={[styles.notificationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.notificationTitle\}(?!\])/g, 
    replacement: 'style={[styles.notificationTitle, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.notificationBody\}(?!\])/g, 
    replacement: 'style={[styles.notificationBody, { color: colors.textSecondary }]}' 
  },
  { 
    pattern: /style=\{styles\.notificationTime\}(?!\])/g, 
    replacement: 'style={[styles.notificationTime, { color: colors.textMuted }]}' 
  },
  
  // Transaction
  { 
    pattern: /style=\{styles\.transactionCard\}(?!\])/g, 
    replacement: 'style={[styles.transactionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}' 
  },
  { 
    pattern: /style=\{styles\.transactionTitle\}(?!\])/g, 
    replacement: 'style={[styles.transactionTitle, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.transactionAmount\}(?!\])/g, 
    replacement: 'style={[styles.transactionAmount, { color: colors.text }]}' 
  },
  { 
    pattern: /style=\{styles\.transactionDate\}(?!\])/g, 
    replacement: 'style={[styles.transactionDate, { color: colors.textSecondary }]}' 
  },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
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
    console.log(`✓ ${fileName} - ${changeCount} more dynamic styles added`);
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

console.log('\n=== Adding more dynamic styles ===\n');
processDir(screensDir);
console.log('\nDone!');
