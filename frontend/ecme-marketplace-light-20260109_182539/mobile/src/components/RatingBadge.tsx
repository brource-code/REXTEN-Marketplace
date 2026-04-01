import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const fontSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return (
              <Text key={i} style={[styles.star, { fontSize: starSize[size], color: '#fbbf24' }]}>
                ★
              </Text>
            );
          } else if (i === fullStars && hasHalfStar) {
            return (
              <Text key={i} style={[styles.star, { fontSize: starSize[size], color: '#fbbf24' }]}>
                ★
              </Text>
            );
          } else {
            return (
              <Text key={i} style={[styles.star, { fontSize: starSize[size], color: '#d1d5db' }]}>
                ★
              </Text>
            );
          }
        })}
      </View>
      <Text style={[styles.ratingText, { fontSize }]}>
        {rating.toFixed(1)}
      </Text>
      {reviewsCount !== undefined && reviewsCount > 0 && (
        <Text style={[styles.reviewsText, { fontSize: fontSize - 2 }]}>
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
    color: '#111827',
    marginLeft: 6,
  },
  reviewsText: {
    color: '#6b7280',
    marginLeft: 4,
  },
});
