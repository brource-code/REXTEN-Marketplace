<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\PaginatesV1;
use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

class ServicesController extends Controller
{
    use PaginatesV1;

    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        [$page, $perPage] = $this->v1Pagination($request);

        $q = Service::where('company_id', $companyId)->with('category');
        if (! $request->boolean('include_inactive')) {
            $q->where('is_active', true);
        }

        $total = (clone $q)->count();
        $rows = $q->orderBy('sort_order')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        $data = $rows->map(fn (Service $service) => [
            'id' => $service->id,
            'name' => $service->name,
            'slug' => $service->slug,
            'category' => $service->category->name ?? null,
            'category_id' => $service->category_id,
            'duration_minutes' => (int) ($service->duration_minutes ?? 60),
            'price' => (float) $service->price,
            'service_type' => $service->service_type ?? 'onsite',
            'is_active' => (bool) $service->is_active,
            'description' => $service->description,
        ]);

        return response()->json([
            'data' => $data,
            'meta' => $this->v1Meta($total, $page, $perPage),
        ]);
    }

    public function show(Request $request, int $id)
    {
        $companyId = (int) $request->get('current_company_id');
        $service = Service::where('company_id', $companyId)
            ->with('category')
            ->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $service->id,
                'name' => $service->name,
                'slug' => $service->slug,
                'category' => $service->category->name ?? null,
                'category_id' => $service->category_id,
                'duration_minutes' => (int) ($service->duration_minutes ?? 60),
                'price' => (float) $service->price,
                'service_type' => $service->service_type ?? 'onsite',
                'is_active' => (bool) $service->is_active,
                'description' => $service->description,
            ],
        ]);
    }
}
