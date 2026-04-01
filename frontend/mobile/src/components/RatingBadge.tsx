import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface RatingBadgeProps {
  rating: number;
  reviewsCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

const starSize = {
  sm: 12,
  md: 16,
  lg: 20,
};

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  reviewsCount,
  size = 'md',
}) => {
  const { colors } = useTheme();
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const fontSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, i) => {
          const isFilled = i < fullStars || (i === fullStars && hasHalfStar);
          return (
            <Text key={i} style={[styles.star, { fontSize: starSize[size], color: isFilled ? colors.warning : colors.textMuted }]}>
              ★
            </Text>
          );
        })}
      </View>
      <Text style={[styles.ratingText, { fontSize, color: colors.text }]}>
        {rating.toFixed(1)}
      </Text>
      {reviewsCount !== undefined && reviewsCount > 0 && (
        <Text style={[styles.reviewsText, { fontSize: fontSize - 2, color: colors.textSecondary }]}>
          ({reviewsCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    fontWeight: '600',
    marginLeft: 6,
  },
  reviewsText: {
    marginLeft: 4,
  },
});
