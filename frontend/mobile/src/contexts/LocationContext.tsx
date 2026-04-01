// Location Context для React Native

import { createContext, useContext } from 'react';
import { State, City } from '../services/location/types';

export interface LocationContextValue {
    state: string | null;
    city: string | null;
    availableStates: State[];
    availableCities: City[];
    setState: (stateId: string | null) => void;
    setCity: (cityName: string | null) => void;
    setLocation: (stateId: string | null, cityName: string | null) => void;
    reset: () => void;
    getStateName: (stateId: string) => string;
    getCityName: (cityName: string) => string;
    isValidLocation: (stateId: string, cityName?: string) => boolean;
    isLoading: boolean;
    error: string | null;
}

export const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function useLocation(): LocationContextValue {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}

