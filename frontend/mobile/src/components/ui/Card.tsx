import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  avatarColor?: string;
  badge?: {
    label: string;
    color: 'default' | 'primary' | 'success' | 'warning' | 'error';
  };
  rightContent?: ReactNode;
}

interface CardStatsProps {
  items: Array<{
    label: string;
    value: string | number;
  }>;
}

interface CardActionsProps {
  children: ReactNode;
}

interface CardActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface CardContentProps {
  children: ReactNode;
}

function CardRoot({ children, onPress }: CardProps) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function CardHeader({ title, subtitle, avatar, avatarColor, badge, rightContent }: CardHeaderProps) {
  const { colors } = useTheme();

  const badgeColors = {
    default: { bg: colors.border, text: colors.textSecondary },
    primary: { bg: colors.primaryLight, text: colors.primaryDark },
    success: { bg: colors.successLight, text: colors.successDark },
    warning: { bg: colors.warningLight, text: colors.warning },
    error: { bg: colors.errorLight, text: colors.error },
  };

  return (
    <View style={styles.header}>
      {avatar && (
        <View style={[styles.avatar, { backgroundColor: avatarColor || colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{avatar}</Text>
        </View>
      )}
      <View style={styles.headerInfo}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badgeColors[badge.color].bg }]}>
              <Text style={[styles.badgeText, { color: badgeColors[badge.color].text }]}>
                {badge.label}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
    </View>
  );
}

function CardContent({ children }: CardContentProps) {
  return <View style={styles.content}>{children}</View>;
}

function CardStats({ items }: CardStatsProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.stats, { borderTopColor: colors.border }]}>
      {items.map((item, index) => (
        <View key={index} style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function CardActions({ children }: CardActionsProps) {
  const { colors } = useTheme();

  return <View style={[styles.actions, { borderTopColor: colors.border }]}>{children}</View>;
}

function CardAction({ icon, label, onPress, variant = 'primary' }: CardActionProps) {
  const { colors } = useTheme();

  const getColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.textSecondary;
      case 'danger':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const color = getColor();

  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
  Stats: CardStats,
  Actions: CardActions,
  Action: CardAction,
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
