import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { getCategories, getStates } from '../api/marketplace';
import { Category, State } from '../types/marketplace';
import { tagDictionary } from '../constants/tags';
import { useLocation } from '../hooks/useLocation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FiltersRouteProp = RouteProp<RootStackParamList, 'Filters'>;

const priceRanges = [
  { id: 'all', label: 'Любой бюджет' },
  { id: 'lt75', label: 'до $75' },
  { id: '75-125', label: '$75 – $125' },
  { id: 'gt125', label: 'от $125' },
];

const ratingOptions = [
  { id: 4, label: '4.0+' },
  { id: 4.5, label: '4.5+' },
  { id: 4.8, label: '4.8+' },
];

const quickTags = Object.entries(tagDictionary).map(([id, label]) => ({
  id,
  label,
}));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 40,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  categoryButtonInactive: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#1d4ed8',
  },
  categoryButtonTextInactive: {
    color: '#374151',
  },
  stateChipsContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  stateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    marginRight: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateChipActive: {
    backgroundColor: '#2563eb',
  },
  stateChipInactive: {
    backgroundColor: '#f3f4f6',
  },
  stateChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stateChipTextActive: {
    color: '#ffffff',
  },
  stateChipTextInactive: {
    color: '#374151',
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipActive: {
    backgroundColor: '#10b981',
  },
  tagChipInactive: {
    backgroundColor: '#f3f4f6',
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagChipTextActive: {
    color: '#ffffff',
  },
  tagChipTextInactive: {
    color: '#374151',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  resetButton: {
    width: 48,
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    marginTop: 8,
  },
  showMoreButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  citySelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 44,
  },
  citySelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  citySelectorPlaceholder: {
    color: '#9ca3af',
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
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    padding: 0,
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
  modalItemText: {
    fontSize: 16,
    color: '#111827',
  },
  modalItemTextActive: {
    color: '#2563eb',
    fontWeight: '600',
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

export const FiltersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FiltersRouteProp>();
  const { filters: initialFilters, onApplyFilters } = route.params;

  // Используем единый источник истины для локации
  const { availableStates, availableCities } = useLocation();

  const [search, setSearch] = useState(initialFilters.search || '');
  const [category, setCategory] = useState(initialFilters.category || 'all');
  const [stateFilter, setStateFilter] = useState(initialFilters.stateFilter || '');
  const [cityFilter, setCityFilter] = useState(initialFilters.cityFilter || '');
  const [priceFilter, setPriceFilter] = useState(initialFilters.priceFilter || 'all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(initialFilters.ratingFilter || null);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters.selectedTags || []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Получаем города для выбранного штата из LocationProvider
  const citiesForSelectedState = stateFilter && stateFilter !== '' && stateFilter !== 'all'
    ? availableCities.filter(c => c.stateId === stateFilter).map(c => c.name)
    : [];

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesData, statesData] = await Promise.all([
          getCategories(),
          getStates(),
        ]);
        setCategories(categoriesData);
        setStates(statesData);
      } catch (error) {
        console.error('Error loading filter data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Обновляем список городов при изменении штата
  useEffect(() => {
    // Если выбранный город не относится к новому штату - сбрасываем его
    if (stateFilter && stateFilter !== '' && stateFilter !== 'all') {
      const citiesForState = availableCities.filter(c => c.stateId === stateFilter).map(c => c.name);
      if (cityFilter && !citiesForState.includes(cityFilter)) {
        setCityFilter('');
      }
    } else {
      setCityFilter('');
    }
  }, [stateFilter, availableCities, cityFilter]);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setStateFilter('');
    setCityFilter('');
    setPriceFilter('all');
    setRatingFilter(null);
    setSelectedTags([]);
  };

  const applyFilters = () => {
    onApplyFilters({
      search,
      category,
      stateFilter,
      cityFilter,
      priceFilter,
      ratingFilter,
      selectedTags,
    });
    navigation.goBack();
  };

  const filteredCities = citiesForSelectedState.filter(city =>
    city.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  const activeFiltersCount = [
    search ? 1 : 0,
    category !== 'all' ? 1 : 0,
    stateFilter ? 1 : 0,
    cityFilter ? 1 : 0,
    priceFilter !== 'all' ? 1 : 0,
    ratingFilter ? 1 : 0,
    selectedTags.length,
  ].reduce((a, b) => a + b, 0);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Заголовок с кнопкой закрытия */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Фильтры</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.scrollContent}>
            {/* Поиск */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Поиск</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Поиск по названию, услуге..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                />
              </View>
            </View>

            {/* Категории */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Категория</Text>
              <TouchableOpacity onPress={() => setCategory('all')}>
                <View 
                  style={[
                    styles.categoryButton,
                    category === 'all' ? styles.categoryButtonActive : styles.categoryButtonInactive
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === 'all' ? styles.categoryButtonTextActive : styles.categoryButtonTextInactive
                    ]}
                  >
                    Все услуги
                  </Text>
                </View>
              </TouchableOpacity>
              {(showAllCategories ? categories : categories.slice(0, 10)).map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                >
                  <View 
                    style={[
                      styles.categoryButton,
                      category === cat.id ? styles.categoryButtonActive : styles.categoryButtonInactive
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        category === cat.id ? styles.categoryButtonTextActive : styles.categoryButtonTextInactive
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {categories.length > 10 && (
                <TouchableOpacity onPress={() => setShowAllCategories(!showAllCategories)}>
                  <View style={styles.showMoreButton}>
                    <Text style={styles.showMoreButtonText}>
                      {showAllCategories ? 'Скрыть' : `Показать еще (${categories.length - 10})`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Штат */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Штат</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                <View style={styles.stateChipsContainer}>
                  <TouchableOpacity onPress={() => {
                    setStateFilter('');
                    setCityFilter('');
                  }}>
                    <View 
                      style={[
                        styles.stateChip,
                        !stateFilter ? styles.stateChipActive : styles.stateChipInactive
                      ]}
                    >
                      <Text
                        style={[
                          styles.stateChipText,
                          !stateFilter ? styles.stateChipTextActive : styles.stateChipTextInactive
                        ]}
                      >
                        Все штаты
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {states.slice(0, 10).map((state) => (
                    <TouchableOpacity
                      key={state.id}
                      onPress={() => {
                        setStateFilter(state.id);
                        // Город сбросится автоматически через useEffect
                      }}
                    >
                      <View
                        style={[
                          styles.stateChip,
                          stateFilter === state.id ? styles.stateChipActive : styles.stateChipInactive
                        ]}
                      >
                        <Text
                          style={[
                            styles.stateChipText,
                            stateFilter === state.id ? styles.stateChipTextActive : styles.stateChipTextInactive
                          ]}
                        >
                          {state.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Город */}
            {stateFilter && stateFilter !== '' && stateFilter !== 'all' && citiesForSelectedState.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Город (опционально)</Text>
                <TouchableOpacity
                  style={styles.citySelectorButton}
                  onPress={() => setShowCityModal(true)}
                >
                  <Ionicons name="location-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                  <Text style={[styles.citySelectorText, !cityFilter && styles.citySelectorPlaceholder]}>
                    {cityFilter || 'Выберите город'}
                  </Text>
                  {cityFilter && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setCityFilter('');
                      }}
                      style={{ marginLeft: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={18} color="#6b7280" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>
            )}

            {/* Бюджет */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Бюджет</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', paddingRight: 16 }}>
                  {priceRanges.map((range) => (
                    <TouchableOpacity
                      key={range.id}
                      onPress={() => setPriceFilter(range.id)}
                      style={{ marginRight: 8 }}
                    >
                      <View
                        style={[
                          styles.categoryButton,
                          priceFilter === range.id ? styles.categoryButtonActive : styles.categoryButtonInactive,
                          { marginBottom: 0, minWidth: 100 }
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            priceFilter === range.id ? styles.categoryButtonTextActive : styles.categoryButtonTextInactive
                          ]}
                        >
                          {range.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Рейтинг */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Рейтинг</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', paddingRight: 16 }}>
                  {ratingOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setRatingFilter(ratingFilter === option.id ? null : option.id)}
                      style={{ marginRight: 8 }}
                    >
                      <View
                        style={[
                          styles.categoryButton,
                          ratingFilter === option.id ? styles.categoryButtonActive : styles.categoryButtonInactive,
                          { marginBottom: 0, minWidth: 80 }
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            ratingFilter === option.id ? styles.categoryButtonTextActive : styles.categoryButtonTextInactive
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Особенности (теги) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Особенности</Text>
              <View style={styles.tagsContainer}>
                {quickTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <View
                      style={[
                        styles.tagChip,
                        selectedTags.includes(tag.id) ? styles.tagChipActive : styles.tagChipInactive
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          selectedTags.includes(tag.id) ? styles.tagChipTextActive : styles.tagChipTextInactive
                        ]}
                      >
                        {tag.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer с кнопками */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Ionicons name="refresh-outline" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={applyFilters} style={styles.applyButton}>
            <Ionicons name="checkmark" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

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
                <Ionicons name="search-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
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

              {cityFilter && (
                <TouchableOpacity 
                  style={styles.clearButton} 
                  onPress={() => {
                    setCityFilter('');
                    setShowCityModal(false);
                    setCitySearchQuery('');
                  }}
                >
                  <Ionicons name="close-circle" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.clearButtonText}>Очистить выбор</Text>
                </TouchableOpacity>
              )}
              
              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      cityFilter === item && styles.modalItemActive,
                    ]}
                    onPress={() => {
                      setCityFilter(item);
                      setShowCityModal(false);
                      setCitySearchQuery('');
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        cityFilter === item && styles.modalItemTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                    {cityFilter === item && (
                      <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      {citySearchQuery ? 'Города не найдены' : 'Города не найдены'}
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
};
