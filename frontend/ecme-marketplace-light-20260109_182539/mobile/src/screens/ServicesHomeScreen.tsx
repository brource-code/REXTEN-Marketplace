import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, FlatList, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { ServiceCard } from '../components/ServiceCard';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { FilterChipsRow } from '../components/FilterChipsRow';
import { LocationSelector } from '../components/LocationSelector';
import { getCategories, getStates, getFilteredServices, getFeaturedServices, ServicesFilters } from '../api/marketplace';
import { Service, Category, State } from '../types/marketplace';
import { useLocation } from '../hooks/useLocation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const priceRanges = [
  { id: 'all', label: 'Любой бюджет', min: undefined, max: undefined },
  { id: 'lt75', label: 'до $75', min: undefined, max: 75 },
  { id: '75-125', label: '$75 – $125', min: 75, max: 125 },
  { id: 'gt125', label: 'от $125', min: 125, max: undefined },
];

const ratingOptions = [
  { id: 4, label: '4.0+' },
  { id: 4.5, label: '4.5+' },
  { id: 4.8, label: '4.8+' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  locationRow: {
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
  },
  filterButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  filterButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 18,
  },
  featuredSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#f9fafb',
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  featuredBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  featuredBadgeText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  featuredList: {
    marginBottom: 8,
  },
  featuredItem: {
    marginRight: 16,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  listHeaderText: {
    fontSize: 15,
    color: '#6b7280',
  },
  listHeaderCount: {
    fontWeight: '600',
    color: '#111827',
  },
  listItem: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export const ServicesHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // Используем единый источник истины для локации
  const { state, city, availableStates, getStateName } = useLocation();
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      
      // Формируем фильтры: приоритет у фильтров, если они установлены, иначе используем локацию из LocationProvider
      const filters: ServicesFilters = {};
      
      // Если в фильтрах выбран конкретный штат - используем его
      // Если в фильтрах явно выбрано "Все штаты" (stateFilter === '') - НЕ применяем фильтр по локации
      // Если в фильтрах штат не выбран (stateFilter undefined/null), но выбрана локация - используем локацию из LocationProvider
      if (stateFilter && stateFilter !== '' && stateFilter !== 'all') {
        filters.state = stateFilter;
        console.log('🔍 Using stateFilter:', stateFilter);
      } else if (stateFilter === '') {
        // Если явно выбрано "Все штаты" - игнорируем локацию, не применяем фильтр
        console.log('🔍 State filter explicitly cleared, not applying location filter');
      } else if (!stateFilter && state) {
        // Если в фильтрах штат не выбран (stateFilter undefined/null), используем локацию из LocationProvider
        filters.state = state;
        console.log('🔍 ✅ Using location state from LocationProvider:', state);
      } else {
        console.log('🔍 ❌ No state filter applied. stateFilter:', stateFilter, 'state:', state, 'type of state:', typeof state);
      }
      
      // Город: приоритет у cityFilter, если он установлен, иначе используем city из LocationProvider
      // Город применяется только если есть штат (state или stateFilter)
      const activeState = stateFilter || state;
      if (cityFilter && cityFilter !== '') {
        filters.city = cityFilter;
        console.log('🔍 Using cityFilter:', cityFilter);
      } else if (activeState && city) {
        // Используем city из LocationProvider только если есть активный штат
        filters.city = city;
        console.log('🔍 Using location city from LocationProvider:', city);
      }
      
      console.log('🔍 Final filters for API:', filters);
      
      const [categoriesData, statesData, servicesData, featuredData] = await Promise.all([
        getCategories(),
        getStates(),
        getFilteredServices(filters),
        getFeaturedServices(3),
      ]);
      
      setCategories(categoriesData);
      setStates(statesData);
      setServices(servicesData);
      setFeaturedServices(featuredData);
      
      console.log('✅ Loaded services:', servicesData.length, 'with filters:', filters);
      if (filters.state && servicesData.length > 0) {
        console.log('📊 Sample services after filter:', servicesData.slice(0, 3).map(s => ({ 
          name: s.name, 
          state: s.state, 
          city: s.city 
        })));
      } else if (filters.state && servicesData.length === 0) {
        console.warn('⚠️ No services found with state filter:', filters.state);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    // Загружаем данные при монтировании
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData();
    }
  }, []);

  // Флаг для предотвращения двойной загрузки
  const isLoadingFromLocationChange = useRef(false);

  // Перезагружаем данные при изменении локации из LocationProvider или фильтров
  useEffect(() => {
    // Пропускаем первую загрузку (она уже обработана выше)
    if (isInitialMount.current) {
      return;
    }
    
    // Пропускаем, если данные уже загружаются из onLocationChange
    if (isLoadingFromLocationChange.current) {
      console.log('🔄 Skipping loadData() - already loading from onLocationChange');
      return;
    }
    
    console.log('🔄 Location or filters changed. state:', state, 'city:', city, 'stateFilter:', stateFilter, 'cityFilter:', cityFilter);
    console.log('🔄 Triggering loadData()...');
    loadData();
  }, [state, city, stateFilter, cityFilter]);

  const applyFilters = async () => {
    setIsLoading(true);
    try {
      const filters: ServicesFilters = {};
      
      if (search) filters.search = search;
      if (category !== 'all') filters.category = category;
      
      // Приоритет у фильтров: если выбран конкретный штат в фильтрах - используем его
      // Если в фильтрах явно выбрано "Все штаты" (stateFilter === '') - НЕ применяем фильтр по локации
      if (stateFilter && stateFilter !== '' && stateFilter !== 'all') {
        filters.state = stateFilter;
      } else if (stateFilter === '') {
        // Если явно выбрано "Все штаты" - игнорируем локацию, не применяем фильтр
      } else if (!stateFilter && state) {
        // Если в фильтрах штат не выбран (stateFilter undefined/null), используем локацию из LocationProvider
        filters.state = state;
      }
      
      // Город: приоритет у cityFilter
      if (cityFilter && cityFilter !== '') {
        filters.city = cityFilter;
      } else if (stateFilter !== '' && !stateFilter && city) {
        filters.city = city;
      }
      
      if (selectedTags.length > 0) filters.tags = selectedTags;
      
      const priceRange = priceRanges.find(p => p.id === priceFilter);
      if (priceRange) {
        if (priceRange.min !== undefined) filters.priceMin = priceRange.min;
        if (priceRange.max !== undefined) filters.priceMax = priceRange.max;
      }
      
      if (ratingFilter) filters.ratingMin = ratingFilter;
      
      const filteredData = await getFilteredServices(filters);
      setServices(filteredData);
    } catch (err: any) {
      console.error('Error applying filters:', err);
      setError(err.message || 'Ошибка применения фильтров');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredListings = useMemo(() => {
    if (isLoading) return [];
    
    const currentActiveState = stateFilter || state;
    console.log('🔍 filteredListings: Starting filter. Total services:', services.length);
    console.log('🔍 filteredListings: currentActiveState:', currentActiveState, 'state:', state, 'stateFilter:', stateFilter);
    console.log('🔍 filteredListings: city:', city, 'cityFilter:', cityFilter);
    
    // Если нет активного штата, показываем все услуги (они уже могут быть отфильтрованы API)
    if (!currentActiveState) {
      console.log('🔍 No active state filter - showing all services');
    }
    
    const filtered = services.filter((service) => {
      const matchesSearch =
        !search ||
        service.name.toLowerCase().includes(search.toLowerCase()) ||
        service.category.toLowerCase().includes(search.toLowerCase()) ||
        service.city.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === 'all' || String(service.group) === String(category);

      // Определяем активный штат для фильтрации
      // Приоритет: stateFilter > state из LocationProvider
      let stateToMatch: string | null = null;
      if (stateFilter && stateFilter !== '' && stateFilter !== 'all') {
        stateToMatch = stateFilter;
      } else if (stateFilter === '') {
        // Если явно выбрано "Все штаты" - не применяем фильтр
        stateToMatch = null;
      } else if (state) {
        // Используем локацию из LocationProvider
        stateToMatch = state;
      }
      
      // Если данные уже отфильтрованы на сервере, не применяем клиентскую фильтрацию по штату
      // Просто проверяем, что service.state существует (данные уже отфильтрованы API)
      const matchesState = (() => {
        if (!stateToMatch) {
          return true; // Нет фильтра - показываем все
        }
        
        if (!service.state) {
          return false; // У услуги нет штата - не показываем
        }
        
        // Прямое совпадение (оба ID или оба названия)
        if (service.state === stateToMatch) {
          return true;
        }
        
        // Проверяем, если stateToMatch это ID, а service.state это название
        const stateById = availableStates.find((s) => s.id === stateToMatch);
        if (stateById && service.state === stateById.name) {
          return true;
        }
        
        // Проверяем, если service.state это ID, а stateToMatch это название
        const serviceStateById = availableStates.find((s) => s.id === service.state);
        if (serviceStateById && stateToMatch === serviceStateById.name) {
          return true;
        }
        
        // Дополнительная проверка: сравнение без учета регистра
        if (service.state && stateToMatch && 
            service.state.toLowerCase() === stateToMatch.toLowerCase()) {
          return true;
        }
        
        // Логируем несовпадение для отладки
        if (stateToMatch && service.state !== stateToMatch) {
          console.log('🔍 State mismatch:', {
            serviceName: service.name,
            serviceState: service.state,
            stateToMatch,
            stateById: stateById?.name,
            serviceStateById: serviceStateById?.name,
          });
        }
        
        return false;
      })();
      
      // Город: приоритет у cityFilter, если он установлен
      // Город применяется только если есть штат (stateToMatch)
      let cityToMatch: string | null = null;
      if (cityFilter && cityFilter !== '') {
        cityToMatch = cityFilter;
      } else if (stateToMatch && city) {
        // Используем city из LocationProvider только если есть активный штат
        cityToMatch = city;
      }
      
      const matchesCity = !cityToMatch || !service.city || service.city === cityToMatch || 
        service.city.toLowerCase().includes(cityToMatch.toLowerCase());

      const matchesPrice = (() => {
        const range = priceRanges.find((p) => p.id === priceFilter);
        if (!range || range.id === 'all') return true;
        if (range.min && service.priceValue < range.min) return false;
        if (range.max && service.priceValue > range.max) return false;
        return true;
      })();

      const matchesRating =
        !ratingFilter || service.rating >= ratingFilter;

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => service.tags.includes(tag));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesState &&
        matchesCity &&
        matchesPrice &&
        matchesRating &&
        matchesTags
      );
    });
    
    // Логирование для отладки
    if (currentActiveState) {
      console.log('🔍 Client-side filtering result:', {
        totalServices: services.length,
        filteredCount: filtered.length,
        currentActiveState,
        sampleStates: services.slice(0, 5).map(s => ({ name: s.name, state: s.state })),
        filteredSampleStates: filtered.slice(0, 5).map(s => ({ name: s.name, state: s.state })),
      });
    } else {
      console.log('🔍 No state filter active. Showing all services:', services.length);
    }
    
    return filtered;
  }, [services, search, category, stateFilter, cityFilter, state, city, availableStates, priceFilter, ratingFilter, selectedTags, isLoading]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const openFilters = () => {
    navigation.navigate('Filters', {
      filters: {
        search,
        category,
        stateFilter,
        cityFilter,
        priceFilter,
        ratingFilter,
        selectedTags,
      },
      onApplyFilters: (newFilters: any) => {
        setSearch(newFilters.search || '');
        setCategory(newFilters.category || 'all');
        setStateFilter(newFilters.stateFilter || '');
        setCityFilter(newFilters.cityFilter || '');
        setPriceFilter(newFilters.priceFilter || 'all');
        setRatingFilter(newFilters.ratingFilter || null);
        setSelectedTags(newFilters.selectedTags || []);
        applyFilters();
      },
    });
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setStateFilter('');
    setCityFilter('');
    setPriceFilter('all');
    setRatingFilter(null);
    setSelectedTags([]);
    loadData();
  };

  if (isLoading && !isRefreshing) {
    return (
      <ScreenContainer>
        <Loader />
      </ScreenContainer>
    );
  }

  if (error && !isRefreshing) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={loadData} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Верхняя панель с поиском и фильтрами */}
        <View style={styles.header}>
          {/* Выбор локации */}
          <View style={styles.locationRow}>
            <LocationSelector
              onLocationChange={async (newState, newCity) => {
                console.log('📍 LocationSelector: onLocationChange called with:', { newState, newCity });
                console.log('📍 LocationSelector: Current state from LocationProvider:', state);
                
                // Локация управляется через LocationProvider автоматически
                // Сбрасываем фильтры, чтобы использовать локацию из LocationProvider
                if (stateFilter) {
                  console.log('📍 Clearing stateFilter and cityFilter to use location');
                  setStateFilter('');
                  setCityFilter('');
                }
                
                // Принудительно загружаем данные с новым штатом сразу
                // Используем newState напрямую, так как state в LocationProvider обновится асинхронно
                if (newState) {
                  console.log('📍 Loading data immediately with new state:', newState);
                  isLoadingFromLocationChange.current = true;
                  
                  const filters: ServicesFilters = { state: newState };
                  if (newCity) {
                    filters.city = newCity;
                  }
                  
                  try {
                    setIsLoading(true);
                    console.log('📍 Loading with filters:', JSON.stringify(filters));
                    const [servicesData, featuredData] = await Promise.all([
                      getFilteredServices(filters),
                      getFeaturedServices(3),
                    ]);
                    
                    console.log('✅ Loaded services with new location:', servicesData.length, 'filters:', JSON.stringify(filters));
                    if (servicesData.length > 0) {
                      console.log('📊 Sample loaded services:', servicesData.slice(0, 5).map(s => ({
                        name: s.name,
                        state: s.state,
                        city: s.city,
                      })));
                      
                      // Проверяем, что все услуги действительно отфильтрованы
                      const uniqueStates = [...new Set(servicesData.map(s => s.state))];
                      console.log('📊 Unique states in loaded services:', uniqueStates);
                      if (uniqueStates.length > 1 || (uniqueStates.length === 1 && uniqueStates[0] !== newState)) {
                        console.warn('⚠️ WARNING: Services contain states other than selected:', uniqueStates, 'Expected:', newState);
                      }
                    } else {
                      console.warn('⚠️ No services returned with filter:', JSON.stringify(filters));
                    }
                    
                    setServices(servicesData);
                    setFeaturedServices(featuredData);
                  } catch (err: any) {
                    console.error('❌ Error loading data with new location:', err);
                    setError(err.message || 'Ошибка загрузки данных');
                  } finally {
                    setIsLoading(false);
                    // Сбрасываем флаг через небольшую задержку, чтобы useEffect не перезагрузил данные
                    setTimeout(() => {
                      isLoadingFromLocationChange.current = false;
                    }, 500);
                  }
                }
              }}
            />
          </View>
          
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Поиск по названию, услуге..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                onSubmitEditing={applyFilters}
              />
            </View>
            <TouchableOpacity
              onPress={openFilters}
              style={styles.filterButton}
            >
              <Ionicons name="options-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Быстрые фильтры */}
          <FilterChipsRow
            chips={[
              { id: 'rating45', label: '4.5+', active: ratingFilter === 4.5 ? true : false, icon: 'star' },
              { id: 'mobile', label: 'На выезд', active: selectedTags.includes('mobile') ? true : false, icon: 'car' },
            ]}
            onToggle={(id) => {
              if (id === 'rating45') {
                setRatingFilter(ratingFilter === 4.5 ? null : 4.5);
              } else if (id === 'mobile') {
                setSelectedTags(
                  selectedTags.includes('mobile')
                    ? selectedTags.filter(t => t !== 'mobile')
                    : [...selectedTags, 'mobile']
                );
              }
            }}
          />
        </View>

        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <>
              {/* Рекомендуемые услуги */}
              {featuredServices.length > 0 && (
                <View style={styles.featuredSection}>
                  <View style={styles.featuredHeader}>
                    <Text style={styles.featuredTitle}>Рекомендуемые</Text>
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>Реклама</Text>
                    </View>
                  </View>
                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.featuredList}>
                    {featuredServices.map((service, idx) => (
                      <View 
                        key={service.id}
                        style={styles.featuredItem}
                      >
                        <ServiceCard
                          service={service}
                          variant="featured"
                          onPress={() => {
                            const slug = service.path?.replace('/marketplace/', '') || service.id;
                            navigation.navigate('ServiceDetails', { slug });
                          }}
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Заголовок списка */}
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  Найдено <Text style={styles.listHeaderCount}>{filteredListings.length}</Text> предложений
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <EmptyState
              title="Услуги не найдены"
              message="Попробуйте изменить фильтры или поисковый запрос"
              actionLabel="Сбросить фильтры"
              onAction={resetFilters}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <ServiceCard
                service={item}
                variant="compact"
                onPress={() => {
                  const slug = item.path?.replace('/marketplace/', '') || item.id;
                  navigation.navigate('ServiceDetails', { slug });
                }}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </ScreenContainer>
  );
};
