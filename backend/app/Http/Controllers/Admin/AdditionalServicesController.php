<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdditionalService;
use App\Models\Advertisement;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

class AdditionalServicesController extends Controller
{
    /**
     * Для /api/business/... — tenant из TenantMiddleware (current_company_id).
     * Для /api/admin/... — null (полный доступ суперадмина).
     */
    private function resolveTenantId(Request $request): ?int
    {
        if (! str_starts_with($request->path(), 'api/business')) {
            return null;
        }

        $id = $request->get('current_company_id');
        if (! $id) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'message' => 'Company not found',
            ], 404));
        }

        return (int) $id;
    }

    /**
     * Доп. услуга, принадлежащая компании (через service или advertisement).
     */
    private function findAdditionalServiceForTenant(int $tenantId, $id): AdditionalService
    {
        return AdditionalService::query()
            ->where(function ($q) use ($tenantId) {
                $q->whereHas('service', fn ($s) => $s->where('company_id', $tenantId))
                    ->orWhereHas('advertisement', fn ($a) => $a->where('company_id', $tenantId));
            })
            ->findOrFail($id);
    }

    /**
     * Получить список дополнительных услуг для услуги
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->resolveTenantId($request);

        $serviceId = $request->get('service_id');

        if (! $serviceId) {
            return response()->json(['error' => 'service_id is required'], 400);
        }

        if ($tenantId !== null) {
            Service::where('company_id', $tenantId)->findOrFail($serviceId);
            $additionalServices = AdditionalService::where('service_id', $serviceId)
                ->ordered()
                ->get();

            return response()->json($additionalServices);
        }

        $additionalServices = AdditionalService::where('service_id', $serviceId)
            ->ordered()
            ->get();

        return response()->json($additionalServices);
    }

    /**
     * Получить дополнительную услугу по ID
     */
    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $this->resolveTenantId($request);

        if ($tenantId !== null) {
            $additionalService = $this->findAdditionalServiceForTenant($tenantId, $id);
        } else {
            $additionalService = AdditionalService::findOrFail($id);
        }

        return response()->json($additionalService);
    }

    /**
     * Создать новую дополнительную услугу
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $tenantId = $this->resolveTenantId($request);

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

            if (empty($validated['service_id']) && empty($validated['advertisement_id'])) {
                return response()->json([
                    'errors' => ['service_id' => ['Необходимо указать service_id или advertisement_id']],
                ], 422);
            }

            if ($tenantId !== null) {
                if (! empty($validated['service_id'])) {
                    Service::where('company_id', $tenantId)->findOrFail($validated['service_id']);
                }
                if (! empty($validated['advertisement_id'])) {
                    Advertisement::where('company_id', $tenantId)->findOrFail($validated['advertisement_id']);
                }
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
            $tenantId = $this->resolveTenantId($request);

            if ($tenantId !== null) {
                $additionalService = $this->findAdditionalServiceForTenant($tenantId, $id);
            } else {
                $additionalService = AdditionalService::findOrFail($id);
            }

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
    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $this->resolveTenantId($request);

        if ($tenantId !== null) {
            $additionalService = $this->findAdditionalServiceForTenant($tenantId, $id);
        } else {
            $additionalService = AdditionalService::findOrFail($id);
        }

        $additionalService->delete();

        return response()->json(['message' => 'Additional service deleted successfully']);
    }

    /**
     * Получить все дополнительные услуги (для суперадмина)
     */
    public function all(Request $request): JsonResponse
    {
        $query = AdditionalService::with('service');

        if ($request->has('service_id')) {
            $query->where('service_id', $request->get('service_id'));
        }

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
        $serviceId = $request->get('service_id');

        if ($serviceId) {
            $query = AdditionalService::where('is_active', true);

            if (is_numeric($serviceId) && (int) $serviceId > 0) {
                $query->where(function ($q) use ($serviceId) {
                    $q->where('service_id', (int) $serviceId)
                        ->orWhere(function ($q2) {
                            $q2->whereNull('service_id')->whereNull('service_json_id');
                        });
                });
            } else {
                $query->where(function ($q) use ($serviceId) {
                    $q->where('service_json_id', (string) $serviceId)
                        ->orWhere(function ($q2) {
                            $q2->whereNull('service_id')->whereNull('service_json_id');
                        });
                });
            }

            $additionalServices = $query->ordered()->get();
        } else {
            $query = AdditionalService::where('advertisement_id', $advertisementId)
                ->where('is_active', true)
                ->whereNull('service_id')
                ->whereNull('service_json_id');

            $additionalServices = $query->ordered()->get();
        }

        return response()->json($additionalServices);
    }
}
