import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterChip {
  id: string;
  label: string;
  active?: boolean;
  icon?: string;
}

interface FilterChipsRowProps {
  chips: FilterChip[];
  onToggle: (id: string) => void;
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    paddingVertical: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  chipInactive: {
    backgroundColor: '#f3f4f6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipTextInactive: {
    color: '#374151',
  },
});

export const FilterChipsRow: React.FC<FilterChipsRowProps> = ({
  chips,
  onToggle,
}) => {
  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {chips.map((chip) => {
        const isActive = chip.active === true;
        return (
          <TouchableOpacity
            key={chip.id}
            onPress={() => onToggle(chip.id)}
            activeOpacity={0.7}
          >
            <View 
              style={[
                styles.chipContainer,
                isActive ? styles.chipActive : styles.chipInactive,
              ]}
            >
              {chip.icon && (
                <Ionicons 
                  name={chip.icon as any} 
                  size={14} 
                  color={isActive ? '#ffffff' : '#374151'} 
                  style={{ marginRight: 4 }}
                />
              )}
              <Text 
                style={[
                  styles.chipText,
                  isActive ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {chip.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};
