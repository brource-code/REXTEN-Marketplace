import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

/** Фиксированная ширина — иначе Swipeable даёт нулевую intrinsic width и кнопки схлопываются. */
const EDIT_W = 78;
const DELETE_W = 84;
const DELETE_SOLO_W = 96;

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit?: () => void;
  /** Если false — без свайпа */
  enabled?: boolean;
};

export function SwipeActionsRow({ children, onDelete, onEdit, enabled = true }: Props) {
  const { colors } = useTheme();
  const ref = useRef<Swipeable>(null);

  const closeAnd = useCallback((fn: () => void) => {
    ref.current?.close();
    fn();
  }, []);

  const renderRightActions = useCallback(() => {
    const totalWidth = onEdit ? EDIT_W + DELETE_W : DELETE_SOLO_W;
    return (
      <View style={[styles.actionsWrap, { width: totalWidth }]}>
        {onEdit ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnEdit, { backgroundColor: colors.primary }]}
            onPress={() => closeAnd(onEdit)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Редактировать"
          >
            <Ionicons name="create-outline" size={24} color={colors.buttonText} />
            <Text style={[styles.btnLabel, { color: colors.buttonText }]}>Изм.</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.btn, styles.btnDelete, !onEdit && styles.btnDeleteSolo, { backgroundColor: colors.error }]}
          onPress={() => closeAnd(onDelete)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Удалить"
        >
          <Ionicons name="trash-outline" size={24} color={colors.buttonText} />
          <Text style={[styles.btnLabel, { color: colors.buttonText }]}>Удалить</Text>
        </TouchableOpacity>
      </View>
    );
  }, [onDelete, onEdit, closeAnd, colors]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={48}
      enableTrackpadTwoFingerGesture={false}
      containerStyle={styles.swipeOuter}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeOuter: {
    overflow: 'hidden',
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    height: '100%',
  },
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  btnEdit: {
    width: EDIT_W,
  },
  btnDelete: {
    width: DELETE_W,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  btnDeleteSolo: {
    width: DELETE_SOLO_W,
  },
  btnLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
  },
});
