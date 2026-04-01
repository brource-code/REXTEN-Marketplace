import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';

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
        <Text style={styles.label}>Постоянная локация</Text>
      )}
      
      <View style={styles.selectorsRow}>
        {/* Выбор штата */}
        <TouchableOpacity
          style={[styles.selectorButton, compact && styles.selectorButtonCompact]}
          onPress={() => setShowStateModal(true)}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Ionicons name="location-outline" size={16} color="#2563eb" style={styles.icon} />
          <Text style={styles.selectorText} numberOfLines={1}>
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
              <Ionicons name="close-circle" size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>

        {/* Выбор города */}
        {state && availableCities.length > 0 && (
          <TouchableOpacity
            style={[styles.selectorButton, compact && styles.selectorButtonCompact]}
            onPress={() => setShowCityModal(true)}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons name="location-outline" size={16} color="#2563eb" style={styles.icon} />
            <Text style={styles.selectorText} numberOfLines={1}>
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
                <Ionicons name="close-circle" size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Показываем выбранную локацию */}
      {(state || city) && showLabel && (
        <View style={styles.selectedLocation}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.selectedLocationText}>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите штат</Text>
              <TouchableOpacity onPress={() => {
                setShowStateModal(false);
                setStateSearchQuery('');
              }}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            {/* Поиск штатов */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#6b7280" style={styles.searchIcon} />
              <TextInput
                placeholder="Поиск штата..."
                placeholderTextColor="#9CA3AF"
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
                style={styles.searchInput}
              />
              {stateSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStateSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>

            {state && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearState}>
                <Ionicons name="close-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.clearButtonText}>Очистить выбор</Text>
              </TouchableOpacity>
            )}
            
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    state === item.id && styles.modalItemActive,
                  ]}
                  onPress={() => handleStateSelect(item.id)}
                >
                  <View style={styles.modalItemContent}>
                    <Text
                      style={[
                        styles.modalItemText,
                        state === item.id && styles.modalItemTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.modalItemSubtext}>{item.id}</Text>
                  </View>
                  {state === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите город</Text>
              <TouchableOpacity onPress={() => {
                setShowCityModal(false);
                setCitySearchQuery('');
              }}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            {/* Поиск городов */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#6b7280" style={styles.searchIcon} />
              <TextInput
                placeholder="Поиск города..."
                placeholderTextColor="#9CA3AF"
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                style={styles.searchInput}
              />
              {citySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCitySearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>

            {city && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearCity}>
                <Ionicons name="close-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.clearButtonText}>Очистить выбор</Text>
              </TouchableOpacity>
            )}
            
            <FlatList
              data={filteredCities}
              keyExtractor={(item, index) => item.id || `${item.name}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    city === item.name && styles.modalItemActive,
                  ]}
                  onPress={() => handleCitySelect(item.name)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      city === item.name && styles.modalItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {city === item.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
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
    color: '#374151',
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
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#111827',
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
    borderTopColor: '#e5e7eb',
  },
  selectedLocationText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    padding: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
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
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemActive: {
    backgroundColor: '#eff6ff',
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  modalItemTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
