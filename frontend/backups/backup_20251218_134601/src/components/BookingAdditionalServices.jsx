'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAdditionalServices, getAdditionalServicesByAdvertisement } from '@/lib/api/additionalServices';

/**
 * Компонент для отображения и выбора дополнительных услуг в букинге
 * 
 * @param {number} serviceId - ID услуги из БД (для загрузки доп. услуг)
 * @param {number} advertisementId - ID объявления (для загрузки доп. услуг объявления)
 * @param {array} selectedServices - Выбранные дополнительные услуги
 * @param {function} onSelectionChange - Callback при изменении выбора
 */
export default function BookingAdditionalServices({ 
  serviceId, 
  advertisementId = null, // ID объявления для загрузки доп. услуг объявления
  selectedServices = [], 
  onSelectionChange 
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
    return <div>Загрузка дополнительных услуг...</div>;
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
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Дополнительные услуги</h3>
      
      <div className="space-y-3">
        {availableServices.map((service) => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          const selectedService = selectedServices.find(s => s.id === service.id);

          return (
            <div
              key={service.id}
              className={`border rounded-lg p-4 ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleService(service)}
                      className="mr-3"
                    />
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      {service.description && (
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="font-semibold">${(parseFloat(service.price) || 0).toFixed(2)}</span>
                        {service.duration && (
                          <span className="text-gray-500">{service.duration} мин</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex items-center">
                    <label className="text-sm text-gray-600 mr-2">Количество:</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedService?.quantity || 1}
                      onChange={(e) => handleQuantityChange(service.id, parseInt(e.target.value) || 1)}
                      className="w-20 border rounded px-2 py-1"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedServices.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Итого по дополнительным услугам:</h4>
          <div className="space-y-1">
            {selectedServices.map((service) => (
              <div key={service.id} className="flex justify-between text-sm">
                <span>{service.name} x{service.quantity}</span>
                <span>${((parseFloat(service.price) || 0) * service.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
              <span>Всего:</span>
              <span>
                ${selectedServices.reduce((sum, s) => sum + (parseFloat(s.price) || 0) * s.quantity, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
