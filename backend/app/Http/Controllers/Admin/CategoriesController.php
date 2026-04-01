<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceCategory;
use App\Helpers\DatabaseHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CategoriesController extends Controller
{
    /**
     * Get all categories.
     */
    public function index(Request $request)
    {
        $query = ServiceCategory::query();

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or');
            });
        }

        // Get total count before pagination
        $total = $query->count();

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);
        $skip = ($page - 1) * $pageSize;

        $categories = $query->orderBy('sort_order')->orderBy('name')
            ->skip($skip)
            ->take($pageSize)
            ->get();

        return response()->json([
            'data' => $categories,
            'total' => $total,
        ]);
    }

    /**
     * Get category by ID.
     */
    public function show($id)
    {
        $category = ServiceCategory::findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    /**
     * Create category.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:service_categories',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors(),
            ], 422);
        }

        $category = ServiceCategory::create($request->all());

        return response()->json([
            'success' => true,
            'data' => $category,
        ], 201);
    }

    /**
     * Update category.
     */
    public function update(Request $request, $id)
    {
        $category = ServiceCategory::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:service_categories,slug,' . $id,
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors(),
            ], 422);
        }

        $category->update($request->all());

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    /**
     * Delete category.
     */
    public function destroy($id)
    {
        $category = ServiceCategory::findOrFail($id);
        
        // Проверяем, есть ли услуги в этой категории
        if ($category->services()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Нельзя удалить категорию, в которой есть услуги',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Категория удалена',
        ]);
    }
}

