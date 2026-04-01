/**
 * API клиент для работы с локациями
 */

import { isLocalhostDirectNextPort } from '@/constants/frontend-ports.constant'

// Статические данные штатов США (для сопоставления с API)
const STATIC_STATES: Record<string, string> = {
  'Alabama': 'AL',
  'Alaska': 'AK',
  'Arizona': 'AZ',
  'Arkansas': 'AR',
  'California': 'CA',
  'Colorado': 'CO',
  'Connecticut': 'CT',
  'Delaware': 'DE',
  'Florida': 'FL',
  'Georgia': 'GA',
  'Hawaii': 'HI',
  'Idaho': 'ID',
  'Illinois': 'IL',
  'Indiana': 'IN',
  'Iowa': 'IA',
  'Kansas': 'KS',
  'Kentucky': 'KY',
  'Louisiana': 'LA',
  'Maine': 'ME',
  'Maryland': 'MD',
  'Massachusetts': 'MA',
  'Michigan': 'MI',
  'Minnesota': 'MN',
  'Mississippi': 'MS',
  'Missouri': 'MO',
  'Montana': 'MT',
  'Nebraska': 'NE',
  'Nevada': 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  'Ohio': 'OH',
  'Oklahoma': 'OK',
  'Oregon': 'OR',
  'Pennsylvania': 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  'Tennessee': 'TN',
  'Texas': 'TX',
  'Utah': 'UT',
  'Vermont': 'VT',
  'Virginia': 'VA',
  'Washington': 'WA',
  'West Virginia': 'WV',
  'Wisconsin': 'WI',
  'Wyoming': 'WY',
  'District of Columbia': 'DC',
};

// Функция для получения кода штата по названию
export function getStateCode(stateName: string): string | null {
  if (!stateName) return null;
  
  // Прямое совпадение
  if (STATIC_STATES[stateName]) {
    return STATIC_STATES[stateName];
  }
  
  // Нормализация и поиск (для обработки опечаток)
  const normalizedName = stateName.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Специальная обработка известных опечаток
  const typoMap: Record<string, string> = {
    'califorina': 'California',
    'californa': 'California',
    'californai': 'California',
  };
  
  const correctedName = typoMap[normalizedName] || stateName;
  if (STATIC_STATES[correctedName]) {
    return STATIC_STATES[correctedName];
  }
  
  // Поиск по частичному совпадению
  for (const [key, value] of Object.entries(STATIC_STATES)) {
    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, ' ');
    // Проверяем точное совпадение после нормализации
    if (normalizedKey === normalizedName) {
      return value;
    }
    // Проверяем, содержит ли название штата часть запроса (для "California State" -> "California")
    if (normalizedKey.includes(normalizedName) || normalizedName.includes(normalizedKey)) {
      return value;
    }
  }
  
  return null;
}

// Функция для динамического определения API URL
// Если фронтенд открыт по IP, используем IP для API тоже
function getLaravelApiUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Для локального домена через nginx - используем относительный путь
    if (hostname === 'rexten.local' || hostname.endsWith('.local')) {
      return '/api';
    }
    
    // Для localhost через nginx (HTTPS на порту 8443) - используем относительный путь
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'https:' && port === '8443') {
      return '/api';
    }
    
    if (
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      (isLocalhostDirectNextPort(port) || (port === '' && protocol === 'http:'))
    ) {
      return 'http://localhost:8000/api';
    }

    if (process.env.NEXT_PUBLIC_LARAVEL_API_URL === '/api') {
      if ((hostname !== 'localhost' && hostname !== '127.0.0.1') || (port === '8443' && protocol === 'https:')) {
        return '/api';
      }
    }
    
    // Если фронтенд открыт по IP (не localhost), используем тот же IP для API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Проверяем, что это IP адрес (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const ipPattern = /^192\.168\.\d+\.\d+$|^10\.\d+\.\d+\.\d+$|^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/;
      if (ipPattern.test(hostname)) {
        // Используем тот же протокол и хост, но порт 8000 для API
        return `${protocol}//${hostname}:8000/api`;
      }
    }
  }
  // Иначе используем переменную окружения или localhost
  return process.env.NEXT_PUBLIC_LARAVEL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
}

export interface State {
  id: string | number; // В статических данных это код штата (например, "CA")
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface City {
  id: number;
  name: string;
  state_id: number;
  is_active?: boolean;
}

/**
 * Получить список штатов
 */
export async function getStates(activeOnly: boolean = false): Promise<State[]> {
  try {
    const params = new URLSearchParams();
    params.append('active_only', activeOnly.toString());
    
    const response = await fetch(`${getLaravelApiUrl()}/locations/states?${params}`);
    
    if (!response.ok) {
      console.warn('Failed to fetch states');
      return [];
    }
    
    const result = await response.json();
    
    // API возвращает данные в формате { success: true, data: [...] }
    if (result.success && Array.isArray(result.data)) {
      return result.data.map((state: any) => {
        // Получаем правильный код штата из статических данных
        const stateCode = getStateCode(state.name) || state.id || state.code;
        return {
          id: stateCode, // Используем код штата из статических данных
          name: state.name,
          code: stateCode,
          is_active: state.is_active !== undefined ? state.is_active : true,
        };
      });
    }
    
    // Fallback: если формат другой, пробуем напрямую
    if (Array.isArray(result)) {
      return result;
    }
    
    if (Array.isArray(result.data)) {
      return result.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
}

/**
 * Получить список городов по штату
 * @param stateId - ID штата (число) или код штата (строка типа "CA")
 */
export async function getCitiesByState(stateId: number | string): Promise<City[]> {
  try {
    if (!stateId) {
      console.warn('StateId is required for fetching cities');
      return [];
    }
    
    // API использует формат /locations/cities?state=...
    // stateId может быть числом (ID) или строкой (код штата)
    const stateParam = String(stateId);
    const url = `${getLaravelApiUrl()}/locations/cities?state=${encodeURIComponent(stateParam)}`;
    
    console.log('Fetching cities for state:', stateParam, 'URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Failed to fetch cities', response.status, response.statusText);
      const errorText = await response.text();
      console.warn('Error response:', errorText);
      return [];
    }
    
    const result = await response.json();
    console.log('Cities API response:', result);
    
    // API возвращает данные в формате { success: true, data: [...] }
    if (result.success && Array.isArray(result.data)) {
      const cities = result.data.map((city: any, index: number) => ({
        id: city.id || `city-${index}`,
        name: city.name,
        state_id: typeof stateId === 'number' ? stateId : 0,
        is_active: city.is_active !== undefined ? city.is_active : true,
      }));
      console.log('Parsed cities:', cities);
      return cities;
    }
    
    // Fallback: если формат другой, пробуем напрямую
    if (Array.isArray(result)) {
      return result.map((city: any, index: number) => ({
        id: city.id || city.name || `city-${index}`,
        name: typeof city === 'string' ? city : (city.name || city),
        state_id: typeof stateId === 'number' ? stateId : 0,
        is_active: true,
      }));
    }
    
    if (Array.isArray(result.data)) {
      return result.data.map((city: any, index: number) => ({
        id: city.id || city.name || `city-${index}`,
        name: typeof city === 'string' ? city : (city.name || city),
        state_id: typeof stateId === 'number' ? stateId : 0,
        is_active: true,
      }));
    }
    
    console.warn('Unexpected API response format:', result);
    return [];
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}

