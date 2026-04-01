<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\Advertisement;
use Illuminate\Http\JsonResponse;

class ServiceController extends Controller
{
    /**
     * Получить услуги по advertisement_id
     */
    public function byAdvertisement($advertisementId): JsonResponse
    {
        // Проверяем что объявление НЕ рекламное
        $advertisement = Advertisement::findOrFail($advertisementId);
        if ($advertisement->isAdType()) {
            // Рекламные объявления не используют услуги через этот метод
            return response()->json([]);
        }
        
        $services = Service::where('advertisement_id', $advertisementId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
        
        return response()->json($services);
    }
}

