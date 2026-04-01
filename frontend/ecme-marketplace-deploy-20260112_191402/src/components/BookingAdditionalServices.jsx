'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAdditionalServices, getAdditionalServicesByAdvertisement } from '@/lib/api/additionalServices';
import { formatDuration } from '@/utils/formatDuration';
import { formatCurrency } from '@/utils/formatCurrency';

/**
 * Компонент для отображения и выбора дополнительных услуг в букинге
 * 
 * @param {number} serviceId - ID услуги из БД (для загрузки доп. услуг)
 * @param {number} advertisementId - ID объявления (для загрузки доп. услуг объявления)
 * @param {array} selectedServices - Выбранные дополнительные услуги
 * @param {function} onSelectionChange - Callback при изменении выбора
 * @param {number} basePrice - Базовая стоимость услуги
 * @param {string} currency - Валюта (USD, EUR, RUB и т.д.)
 */
export default function BookingAdditionalServices({ 
  serviceId, 
  advertisementId = null, // ID объявления для загрузки доп. услуг объявления
  selectedServices = [], 
  onSelectionChange,
  basePrice = 0,
  currency = 'USD'
}) {
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log('[BookingAdditionalServices] Component rendered:', {
    serviceId,
    advertisementId,
    hasServiceId: !!serviceId,
    hasAdvertisementId: !!advertisementId,
    selectedServicesCount: selectedServices.length
  });

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const servicesFromDB = [];

      console.log('[BookingAdditionalServices] Loading services:', {
        serviceId,
        advertisementId,
        hasServiceId: !!serviceId,
        hasAdvertisementId: !!advertisementId
      });

      // Загружаем дополнительные услуги из БД (если есть service_id)
      if (serviceId) {
        try {
          console.log('[BookingAdditionalServices] Loading services by serviceId:', serviceId);
          const dbServices = await getAdditionalServices(serviceId);
          console.log('[BookingAdditionalServices] Services from DB by serviceId:', dbServices);
          servicesFromDB.push(...dbServices.filter(s => s.is_active));
        } catch (error) {
          console.error('[BookingAdditionalServices] Error loading additional services from DB:', error);
        }
      }

      // Загружаем дополнительные услуги для объявления (если есть advertisement_id)
      if (advertisementId) {
        try {
          console.log('[BookingAdditionalServices] Loading services by advertisementId:', advertisementId, 'serviceId:', serviceId);
          const adServices = await getAdditionalServicesByAdvertisement(advertisementId, serviceId || undefined);
          console.log('[BookingAdditionalServices] Services from DB by advertisementId:', adServices);
          servicesFromDB.push(...adServices.filter(s => s.is_active));
        } catch (error) {
          console.error('[BookingAdditionalServices] Error loading additional services for advertisement:', error);
        }
      }

      // Убираем дубликаты по ID (так как услуги уже в БД)
      const uniqueServices = servicesFromDB.reduce((acc, service) => {
        if (!acc.find(s => s.id === service.id)) {
          acc.push(service);
        }
        return acc;
      }, []);

      // Сортируем по sort_order
      uniqueServices.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Нормализуем price - преобразуем строки в числа
      const normalizedServices = uniqueServices.map(service => ({
        ...service,
        price: parseFloat(service.price) || 0
      }));

      setAvailableServices(normalizedServices);
      console.log('[BookingAdditionalServices] Final available services:', {
        count: uniqueServices.length,
        services: uniqueServices,
        servicesFromDB: servicesFromDB.length,
        uniqueCount: uniqueServices.length
      });
    } catch (error) {
      console.error('[BookingAdditionalServices] Error loading additional services:', error);
    } finally {
      setLoading(false);
    }
  }, [serviceId, advertisementId]);

  useEffect(() => {
    console.log('[BookingAdditionalServices] useEffect triggered:', {
      serviceId,
      advertisementId,
      hasServiceId: !!serviceId,
      hasAdvertisementId: !!advertisementId
    });
    loadServices();
  }, [loadServices]);

  const handleToggleService = (service) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    
    if (isSelected) {
      // Удаляем из выбранных
      onSelectionChange(selectedServices.filter(s => s.id !== service.id));
    } else {
      // Добавляем в выбранные с количеством 1
      onSelectionChange([
        ...selectedServices,
        { ...service, quantity: 1 }
      ]);
    }
  };

  const handleQuantityChange = (serviceId, quantity) => {
    const updated = selectedServices.map(s => 
      s.id === serviceId ? { ...s, quantity: Math.max(1, quantity) } : s
    );
    onSelectionChange(updated);
  };

  console.log('[BookingAdditionalServices] Render check:', {
    loading,
    availableServicesCount: availableServices.length,
    willRender: !loading && availableServices.length > 0
  });

  if (loading) {
    console.log('[BookingAdditionalServices] Rendering loading state');
    return (
      <div className="mt-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка дополнительных услуг...</div>
      </div>
    );
  }

  if (availableServices.length === 0) {
    console.log('[BookingAdditionalServices] No services available, returning null');
    return null;
  }

  console.log('[BookingAdditionalServices] Rendering services list:', {
    servicesCount: availableServices.length,
    services: availableServices
  });

  return (
    <div className="space-y-4 pt-2">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Дополнительные услуги
        </label>
        
        <div className="mt-1 space-y-3">
          {availableServices.map((service) => {
            const isSelected = selectedServices.some(s => s.id === service.id);
            const selectedService = selectedServices.find(s => s.id === service.id);

            return (
              <div
                key={service.id}
                className={`rounded-xl border transition ${
                  isSelected 
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleService(service)}
                          className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                            {service.name}
                          </h5>
                          {service.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(parseFloat(service.price) || 0, service.currency || currency)}
                            </span>
                            {service.duration && service.duration > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDuration(service.duration, 'minutes')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          Количество:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={selectedService?.quantity || 1}
                          onChange={(e) => handleQuantityChange(service.id, parseInt(e.target.value) || 1)}
                          className="w-20 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(selectedServices.length > 0 || basePrice > 0) && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Итого:
          </label>
          <div className="mt-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
            <div className="space-y-2">
              {/* Базовая стоимость услуги */}
              {basePrice > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    Базовая стоимость услуги
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(basePrice, currency)}
                  </span>
                </div>
              )}
              
              {/* Дополнительные услуги */}
              {selectedServices.length > 0 && (
                <>
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {service.name} × {service.quantity}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency((parseFloat(service.price) || 0) * service.quantity, service.currency || currency)}
                      </span>
                    </div>
                  ))}
                </>
              )}
              
              {/* Итого общий */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Итого:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(
                    basePrice + selectedServices.reduce((sum, s) => sum + (parseFloat(s.price) || 0) * s.quantity, 0),
                    currency
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
