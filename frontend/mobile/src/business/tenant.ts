import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@business_tenant_id';

let currentCompanyId: number | null = null;

export function getTenantCompanyId(): number | null {
  return currentCompanyId;
}

export async function setTenantCompanyId(id: number | null): Promise<void> {
  currentCompanyId = id;
  if (id == null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, String(id));
}

export async function hydrateTenantFromStorage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw != null && raw !== '') {
      const n = parseInt(raw, 10);
      currentCompanyId = Number.isFinite(n) ? n : null;
    }
  } catch {
    currentCompanyId = null;
  }
}

export function clearTenantInMemory(): void {
  currentCompanyId = null;
}
