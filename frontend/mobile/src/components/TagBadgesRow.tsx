import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tagDictionary } from '../constants/tags';
import { useTheme } from '../contexts/ThemeContext';

interface TagBadgesRowProps {
  tags: string[];
  maxVisible?: number;
}

export const TagBadgesRow: React.FC<TagBadgesRowProps> = ({
  tags,
  maxVisible = 3,
}) => {
  const { colors } = useTheme();
  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <View style={styles.container}>
      {visibleTags.map((tag, idx) => (
        <View
          key={tag}
          style={[styles.badge, idx > 0 && styles.badgeMargin, { backgroundColor: colors.backgroundTertiary }]}
        >
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            {tagDictionary[tag] || tag}
          </Text>
        </View>
      ))}
      {remainingCount > 0 && (
        <View style={[styles.badge, styles.badgeMargin, { backgroundColor: colors.backgroundTertiary }]}>
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 6,
  },
  badgeMargin: {
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
