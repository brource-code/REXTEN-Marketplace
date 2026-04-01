import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { useTheme } from '../contexts/ThemeContext';

interface LocationSelectorProps {
  onLocationChange?: (state: string | null, city: string | null) => void;
  showLabel?: boolean;
  compact?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ 
  onLocationChange, 
  showLabel = false,
  compact = false 
}) => {
  // Используем единый источник истины из LocationProvider
  const { colors } = useTheme();
  const { 
    state, 
    city, 
    setState, 
    setCity, 
    availableStates, 
    availableCities, 
    getStateName,
    isLoading 
  } = useLocation();

  const [showStateModal, setShowStateModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [citySearchQuery, setCitySearchQuery] = useState('');

  const handleStateSelect = (stateId: string) => {
    setState(stateId);
    setShowStateModal(false);
    setStateSearchQuery('');
    onLocationChange?.(stateId, null); // Город сбрасывается автоматически в setState
  };

  const handleCitySelect = (cityName: string) => {
    setCity(cityName);
    setShowCityModal(false);
    setCitySearchQuery('');
    onLocationChange?.(state, cityName);
  };

  const handleClearState = () => {
    setState(null);
    setShowStateModal(false);
    setStateSearchQuery('');
    onLocationChange?.(null, null);
  };

  const handleClearCity = () => {
    setCity(null);
    setShowCityModal(false);
    setCitySearchQuery('');
    onLocationChange?.(state, null);
  };

  // Фильтрация штатов по поисковому запросу
  const filteredStates = useMemo(() => {
    if (!stateSearchQuery) return availableStates;
    const query = stateSearchQuery.toLowerCase();
    return availableStates.filter(state =>
      state.name.toLowerCase().includes(query) ||
      state.id.toLowerCase().includes(query)
    );
  }, [availableStates, stateSearchQuery]);

  // Фильтрация городов по поисковому запросу
  const filteredCities = useMemo(() => {
    if (!citySearchQuery) return availableCities;
    const query = citySearchQuery.toLowerCase();
    return availableCities.filter(city =>
      city.name.toLowerCase().includes(query)
    );
  }, [availableCities, citySearchQuery]);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {showLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>Постоянная локация</Text>
      )}
      
      <View style={styles.selectorsRow}>
        {/* Выбор штата */}
        <TouchableOpacity
          style={[styles.selectorButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, compact && styles.selectorButtonCompact]}
          onPress={() => setShowStateModal(true)}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Ionicons name="location-outline" size={16} color={colors.primary} style={styles.icon} />
          <Text style={[styles.selectorText, { color: colors.text }]} numberOfLines={1}>
            {state ? getStateName(state) : 'Штат'}
          </Text>
          {state && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleClearState();
              }}
              style={styles.clearIcon}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Выбор города */}
        {state && availableCities.length > 0 && (
          <TouchableOpacity
            style={[styles.selectorButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, compact && styles.selectorButtonCompact]}
            onPress={() => setShowCityModal(true)}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="location-outline" size={16} color={colors.primary} style={styles.icon} />
            <Text style={[styles.selectorText, { color: colors.text }]} numberOfLines={1}>
              {city || 'Город (опционально)'}
            </Text>
            {city && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleClearCity();
                }}
                style={styles.clearIcon}
              >
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Показываем выбранную локацию */}
      {(state || city) && showLabel && (
        <View style={[styles.selectedLocation, { borderTopColor: colors.border }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.selectedLocationText, { color: colors.textSecondary }]}>
            {city && `${city}, `}{state && getStateName(state)}
          </Text>
        </View>
      )}

      {/* Модальное окно выбора штата */}
      <Modal
        visible={showStateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowStateModal(false);
          setStateSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Выберите штат</Text>
              <TouchableOpacity onPress={() => {
                setShowStateModal(false);
                setStateSearchQuery('');
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Поиск штатов */}
            <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                placeholder="Поиск штата..."
                placeholderTextColor={colors.textMuted}
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {stateSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStateSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {state && (
              <TouchableOpacity style={[styles.clearButton, { borderBottomColor: colors.backgroundTertiary }]} onPress={handleClearState}>
                <Ionicons name="close-circle" size={16} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={[styles.clearButtonText, { color: colors.error }]}>Очистить выбор</Text>
              </TouchableOpacity>
            )}
            
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.backgroundTertiary },
                    state === item.id && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => handleStateSelect(item.id)}
                >
                  <View style={styles.modalItemContent}>
                    <Text
                      style={[
                        styles.modalItemText,
                        { color: colors.text },
                        state === item.id && { color: colors.primary, fontWeight: '600' },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.modalItemSubtext, { color: colors.textSecondary }]}>{item.id}</Text>
                  </View>
                  {state === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                    {isLoading ? 'Загрузка...' : 'Штаты не найдены'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Модальное окно выбора города */}
      <Modal
        visible={showCityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCityModal(false);
          setCitySearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Выберите город</Text>
              <TouchableOpacity onPress={() => {
                setShowCityModal(false);
                setCitySearchQuery('');
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Поиск городов */}
            <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                placeholder="Поиск города..."
                placeholderTextColor={colors.textMuted}
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {citySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCitySearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {city && (
              <TouchableOpacity style={[styles.clearButton, { borderBottomColor: colors.backgroundTertiary }]} onPress={handleClearCity}>
                <Ionicons name="close-circle" size={16} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={[styles.clearButtonText, { color: colors.error }]}>Очистить выбор</Text>
              </TouchableOpacity>
            )}
            
            <FlatList
              data={filteredCities}
              keyExtractor={(item, index) => item.id || `${item.name}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.backgroundTertiary },
                    city === item.name && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => handleCitySelect(item.name)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      { color: colors.text },
                      city === item.name && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {city === item.name && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                    {isLoading ? 'Загрузка...' : (citySearchQuery ? 'Города не найдены' : 'Сначала выберите штат')}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    minWidth: 120,
    flex: 1,
    minHeight: 44,
  },
  selectorButtonCompact: {
    flex: 0,
    maxWidth: 150,
  },
  icon: {
    marginRight: 6,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  clearIcon: {
    marginRight: 4,
    padding: 2,
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  selectedLocationText: {
    fontSize: 13,
    marginLeft: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    marginBottom: 2,
  },
  modalItemSubtext: {
    fontSize: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
});
