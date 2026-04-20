<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\PaginatesV1;
use App\Http\Controllers\Controller;
use App\Models\TeamMember;
use Illuminate\Http\Request;

class TeamMembersController extends Controller
{
    use PaginatesV1;

    public function index(Request $request)
    {
        $companyId = (int) $request->get('current_company_id');
        [$page, $perPage] = $this->v1Pagination($request);

        $q = TeamMember::where('company_id', $companyId);
        if (! $request->boolean('include_inactive')) {
            $q->where('is_active', true);
        }

        $total = (clone $q)->count();
        $rows = $q->orderBy('sort_order')
            ->orderBy('id')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        $data = $rows->map(fn (TeamMember $m) => [
            'id' => $m->id,
            'name' => $m->name,
            'email' => $m->email,
            'phone' => $m->phone,
            'role' => $m->role,
            'status' => $m->status,
            'is_active' => (bool) $m->is_active,
            'sort_order' => (int) ($m->sort_order ?? 0),
            'default_start_time' => $m->default_start_time,
            'default_end_time' => $m->default_end_time,
            'max_jobs_per_day' => $m->max_jobs_per_day,
        ]);

        return response()->json([
            'data' => $data,
            'meta' => $this->v1Meta($total, $page, $perPage),
        ]);
    }
}
