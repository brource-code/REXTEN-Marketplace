import React, { ReactNode, createContext, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const CardCompactContext = createContext(false);

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Узкая карточка (списки клиентов и т.п.) — меньше отступов и высота строк */
  compact?: boolean;
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

function CardRoot({ children, onPress, compact = false }: CardProps) {
  const { colors } = useTheme();

  const cardBody = (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      {children}
    </View>
  );

  const wrapped = (
    <CardCompactContext.Provider value={compact}>
      {cardBody}
    </CardCompactContext.Provider>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {wrapped}
      </TouchableOpacity>
    );
  }

  return wrapped;
}

function CardHeader({ title, subtitle, avatar, avatarColor, badge, rightContent }: CardHeaderProps) {
  const { colors } = useTheme();
  const compact = useContext(CardCompactContext);

  const badgeColors = {
    default: { bg: colors.border, text: colors.textSecondary },
    primary: { bg: colors.primaryLight, text: colors.primaryDark },
    success: { bg: colors.successLight, text: colors.successDark },
    warning: { bg: colors.warningLight, text: colors.warning },
    error: { bg: colors.errorLight, text: colors.error },
  };

  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      {avatar && (
        <View
          style={[
            styles.avatar,
            compact && styles.avatarCompact,
            { backgroundColor: avatarColor || colors.primaryLight },
          ]}
        >
          <Text style={[styles.avatarText, compact && styles.avatarTextCompact, { color: colors.primary }]}>
            {avatar}
          </Text>
        </View>
      )}
      <View style={styles.headerInfo}>
        <View style={[styles.titleRow, compact && styles.titleRowCompact]}>
          <Text
            style={[styles.title, compact && styles.titleCompact, { color: colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {badge && (
            <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: badgeColors[badge.color].bg }]}>
              <Text style={[styles.badgeText, compact && styles.badgeTextCompact, { color: badgeColors[badge.color].text }]}>
                {badge.label}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text
            style={[styles.subtitle, compact && styles.subtitleCompact, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
    </View>
  );
}

function CardContent({ children }: CardContentProps) {
  const compact = useContext(CardCompactContext);
  return <View style={[styles.content, compact && styles.contentCompact]}>{children}</View>;
}

function CardStats({ items }: CardStatsProps) {
  const { colors } = useTheme();
  const compact = useContext(CardCompactContext);

  return (
    <View style={[styles.stats, compact && styles.statsCompact, { borderTopColor: colors.border }]}>
      {items.map((item, index) => (
        <View key={index} style={styles.statItem}>
          <Text style={[styles.statLabel, compact && styles.statLabelCompact, { color: colors.textSecondary }]}>
            {item.label}
          </Text>
          <Text style={[styles.statValue, compact && styles.statValueCompact, { color: colors.text }]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CardActions({ children }: CardActionsProps) {
  const { colors } = useTheme();
  const compact = useContext(CardCompactContext);

  return <View style={[styles.actions, compact && styles.actionsCompact, { borderTopColor: colors.border }]}>{children}</View>;
}

function CardAction({ icon, label, onPress, variant = 'primary' }: CardActionProps) {
  const { colors } = useTheme();
  const compact = useContext(CardCompactContext);

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
  const iconSize = compact ? 15 : 16;

  return (
    <TouchableOpacity
      style={[styles.actionBtn, compact && styles.actionBtnCompact]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={iconSize} color={color} />
      <Text style={[styles.actionText, compact && styles.actionTextCompact, { color }]}>{label}</Text>
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
  cardCompact: {
    marginBottom: 8,
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  headerCompact: {
    padding: 10,
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatarTextCompact: {
    fontSize: 14,
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
  titleRowCompact: {
    marginBottom: 2,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  titleCompact: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitleCompact: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextCompact: {
    fontSize: 10,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  contentCompact: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statsCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabelCompact: {
    fontSize: 11,
    marginBottom: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statValueCompact: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionsCompact: {
    minHeight: 0,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionBtnCompact: {
    paddingVertical: 9,
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionTextCompact: {
    fontSize: 12,
  },
});
