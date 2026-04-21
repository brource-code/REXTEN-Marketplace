'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAdditionalServices, getAdditionalServicesByAdvertisement } from '@/lib/api/additionalServices';
import { formatDuration } from '@/utils/formatDuration';
import { formatCurrency } from '@/utils/formatCurrency';
import Checkbox from '@/components/ui/Checkbox';

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
  currency = 'USD',
  editablePrice = false, // Разрешить менять цену доп. услуги при редактировании
}) {
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const servicesFromDB = [];

      // Загружаем дополнительные услуги из БД (если есть service_id)
      if (serviceId) {
        try {
          const dbServices = await getAdditionalServices(serviceId);
          servicesFromDB.push(...dbServices.filter(s => s.is_active));
        } catch (error) {
          console.error('[BookingAdditionalServices] Error loading additional services from DB:', error);
        }
      }

      // Загружаем дополнительные услуги для объявления (если есть advertisement_id)
      if (advertisementId) {
        try {
          const adServices = await getAdditionalServicesByAdvertisement(advertisementId, serviceId || undefined);
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
    } catch (error) {
      console.error('[BookingAdditionalServices] Error loading additional services:', error);
    } finally {
      setLoading(false);
    }
  }, [serviceId, advertisementId]);

  useEffect(() => {
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

  const handlePriceChange = (serviceId, price) => {
    const updated = selectedServices.map(s => 
      s.id === serviceId ? { ...s, price: parseFloat(price) || 0 } : s
    );
    onSelectionChange(updated);
  };

  if (loading) {
    return (
      <div className="mt-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">Загрузка дополнительных услуг...</div>
      </div>
    );
  }

  if (availableServices.length === 0) {
    return null;
  }

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
                    <Checkbox
                      className="flex-1 !items-start"
                      checkboxClass="shrink-0 mt-1 !m-0"
                      checked={isSelected}
                      onChange={() => handleToggleService(service)}
                    >
                      <div className="min-w-0 flex-1">
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
                    </Checkbox>

                    {isSelected && (
                      <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            Кол-во:
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={selectedService?.quantity || 1}
                            onChange={(e) => handleQuantityChange(service.id, parseInt(e.target.value) || 1)}
                            className="w-16 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1.5 text-sm"
                          />
                        </div>
                        {editablePrice && (
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              Цена:
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selectedService?.price ?? service.price ?? ''}
                              onChange={(e) => handlePriceChange(service.id, e.target.value)}
                              className="w-20 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1.5 text-sm"
                            />
                          </div>
                        )}
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
