import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { isBusinessAppRole } from '../constants/roles';
import {
  getBusinessCompanies,
  getBusinessProfile,
  BusinessProfile,
  BusinessCompanyItem,
} from '../api/business';
import { hydrateTenantFromStorage, setTenantCompanyId } from '../business/tenant';

const STORAGE_KEY = '@business_tenant_id';

interface BusinessContextValue {
  profile: BusinessProfile | null;
  companies: BusinessCompanyItem[];
  companyId: number | null;
  isReady: boolean;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user && isBusinessAppRole(user.role);

  const query = useQuery({
    queryKey: ['business-bootstrap', user?.id],
    queryFn: async () => {
      await hydrateTenantFromStorage();
      const companies = await getBusinessCompanies();
      if (!companies.length) {
        throw new Error('Нет доступных компаний');
      }
      let id = companies[0].id;
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const n = parseInt(stored, 10);
          if (companies.some((c) => c.id === n)) {
            id = n;
          }
        }
      } catch {
        /* ignore */
      }
      await setTenantCompanyId(id);
      const profile = await getBusinessProfile();
      return { profile, companies, companyId: id };
    },
    enabled,
    retry: 1,
  });

  const value = useMemo<BusinessContextValue>(
    () => ({
      profile: query.data?.profile ?? null,
      companies: query.data?.companies ?? [],
      companyId: query.data?.companyId ?? null,
      /** После ошибки bootstrap нельзя оставлять isReady=false — иначе вечный лоадер */
      isReady: enabled ? !query.isPending : true,
      error: (query.error as Error) ?? null,
      isLoading: enabled && query.isPending,
      refetch: () => {
        queryClient.invalidateQueries({ queryKey: ['business-bootstrap'] });
      },
    }),
    [enabled, query.data, query.isPending, query.error, queryClient]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusiness must be used within BusinessProvider');
  }
  return ctx;
}

/** Вне бизнес-ветки провайдер может не использоваться — заглушка */
export function useBusinessOptional(): BusinessContextValue | null {
  return useContext(BusinessContext);
}
