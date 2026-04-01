// Hook для использования Location Context

import { useLocation as useLocationContext } from '../contexts/LocationContext';

export function useLocation() {
    return useLocationContext();
}

