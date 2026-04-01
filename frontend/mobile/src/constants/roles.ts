export const CLIENT = 'CLIENT';
export const BUSINESS_OWNER = 'BUSINESS_OWNER';
export const SUPERADMIN = 'SUPERADMIN';

/** Нормализация роли с API/кэша (пробелы, лишние типы) */
export function normalizeAppRole(role?: string | null): string | undefined {
  if (role == null) return undefined;
  const s = String(role).trim();
  return s || undefined;
}

export function isBusinessAppRole(role?: string): boolean {
  const r = normalizeAppRole(role);
  return r === BUSINESS_OWNER || r === SUPERADMIN;
}

/** Маршруты /client/* на бэкенде только для роли CLIENT */
export function isClientAppRole(role?: string): boolean {
  return normalizeAppRole(role) === CLIENT;
}
