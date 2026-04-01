<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdditionalService;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class AdditionalServicesController extends Controller
{
    /**
     * Получить список дополнительных услуг для услуги
     */
    public function index(Request $request): JsonResponse
    {
        $serviceId = $request->get('service_id');
        
        if (!$serviceId) {
            return response()->json(['error' => 'service_id is required'], 400);
        }

        $additionalServices = AdditionalService::where('service_id', $serviceId)
            ->ordered()
            ->get();

        return response()->json($additionalServices);
    }

    /**
     * Получить дополнительную услугу по ID
     */
    public function show($id): JsonResponse
    {
        $additionalService = AdditionalService::findOrFail($id);
        
        return response()->json($additionalService);
    }

    /**
     * Создать новую дополнительную услугу
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'service_id' => 'nullable|exists:services,id',
                'advertisement_id' => 'nullable|exists:advertisements,id',
                'service_json_id' => 'nullable|string',
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'price' => 'required|numeric|min:0',
                'duration' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
                'sort_order' => 'integer|min:0',
            ]);

            // Проверяем, что указан либо service_id, либо advertisement_id
            if (empty($validated['service_id']) && empty($validated['advertisement_id'])) {
                return response()->json([
                    'errors' => ['service_id' => ['Необходимо указать service_id или advertisement_id']]
                ], 422);
            }

            $additionalService = AdditionalService::create($validated);

            return response()->json($additionalService, 201);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        }
    }

    /**
     * Обновить дополнительную услугу
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $additionalService = AdditionalService::findOrFail($id);

            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'price' => 'sometimes|required|numeric|min:0',
                'duration' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
                'sort_order' => 'integer|min:0',
            ]);

            $additionalService->update($validated);

            return response()->json($additionalService);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        }
    }

    /**
     * Удалить дополнительную услугу
     */
    public function destroy($id): JsonResponse
    {
        $additionalService = AdditionalService::findOrFail($id);
        $additionalService->delete();

        return response()->json(['message' => 'Additional service deleted successfully']);
    }

    /**
     * Получить все дополнительные услуги (для суперадмина)
     */
    public function all(Request $request): JsonResponse
    {
        $query = AdditionalService::with('service');

        // Фильтрация по услуге
        if ($request->has('service_id')) {
            $query->where('service_id', $request->get('service_id'));
        }

        // Фильтрация по активности
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $additionalServices = $query->ordered()->get();

        return response()->json($additionalServices);
    }

    /**
     * Получить дополнительные услуги для объявления (публичный API)
     */
    public function byAdvertisement(Request $request, $advertisementId): JsonResponse
    {
        $serviceId = $request->get('service_id'); // ID услуги из JSON (может быть строка для виртуальных услуг)
        
        $query = AdditionalService::where('advertisement_id', $advertisementId)
            ->where('is_active', true);

        // Если передан service_id, фильтруем по нему
        if ($serviceId) {
            // Проверяем, это реальная услуга (число) или виртуальная (строка)
            if (is_numeric($serviceId) && (int)$serviceId > 0) {
                // Реальная услуга из таблицы services
                $query->where(function($q) use ($serviceId) {
                    $q->where('service_id', (int)$serviceId)
                      ->orWhere(function($q2) {
                          // Общие услуги для всех (старая логика)
                          $q2->whereNull('service_id')->whereNull('service_json_id');
                      });
                });
            } else {
                // Виртуальная услуга - фильтруем по service_json_id
                $query->where(function($q) use ($serviceId) {
                    $q->where('service_json_id', (string)$serviceId)
                      ->orWhere(function($q2) {
                          // Общие услуги для всех (старая логика)
                          $q2->whereNull('service_id')->whereNull('service_json_id');
                      });
                });
            }
        } else {
            // Если service_id не передан, показываем только общие услуги (старая логика)
            $query->whereNull('service_id')->whereNull('service_json_id');
        }

        $additionalServices = $query->ordered()->get();

        return response()->json($additionalServices);
    }
}

