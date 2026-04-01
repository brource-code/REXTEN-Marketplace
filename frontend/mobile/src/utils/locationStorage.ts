import AsyncStorage from '@react-native-async-storage/async-storage';

const STATE_KEY = '@selected_state';
const CITY_KEY = '@selected_city';

export const saveSelectedState = async (stateId: string | null): Promise<void> => {
  if (stateId) {
    await AsyncStorage.setItem(STATE_KEY, stateId);
  } else {
    await AsyncStorage.removeItem(STATE_KEY);
  }
};

export const saveSelectedCity = async (city: string | null): Promise<void> => {
  if (city) {
    await AsyncStorage.setItem(CITY_KEY, city);
  } else {
    await AsyncStorage.removeItem(CITY_KEY);
  }
};

export const getSelectedState = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(STATE_KEY);
};

export const getSelectedCity = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(CITY_KEY);
};

export const clearLocation = async (): Promise<void> => {
  await AsyncStorage.multiRemove([STATE_KEY, CITY_KEY]);
};

