<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\DatabaseHelper;
use App\Http\Controllers\Controller;
use App\Models\Advertisement;
use App\Models\Company;
use App\Models\Review;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    private const LIMIT = 15;

    /**
     * Глобальный поиск для суперадминки (без тенанта).
     */
    public function __invoke(Request $request)
    {
        $q = trim((string) $request->get('query', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['sections' => []]);
        }

        $sections = [];

        $companies = $this->searchCompanies($q);
        if ($companies->isNotEmpty()) {
            $sections[] = [
                'key' => 'companies',
                'items' => $companies->map(function (Company $c) {
                    $ownerLabel = '';
                    if ($c->owner) {
                        if ($c->owner->profile) {
                            $ownerLabel = trim(
                                ($c->owner->profile->first_name ?? '') . ' ' . ($c->owner->profile->last_name ?? '')
                            );
                        }
                        if ($ownerLabel === '') {
                            $ownerLabel = $c->owner->email ?? '';
                        }
                    }

                    return [
                        'key' => 'company-' . $c->id,
                        'path' => '/superadmin/companies/' . $c->id,
                        'title' => $c->name ?? ('Company #' . $c->id),
                        'subtitle' => trim(implode(' · ', array_filter([$c->email, $c->phone, $ownerLabel]))),
                        'icon' => 'companies',
                    ];
                })->values()->all(),
            ];
        }

        $users = $this->searchUsers($q);
        if ($users->isNotEmpty()) {
            $sections[] = [
                'key' => 'users',
                'items' => $users->map(function (User $u) {
                    $name = $u->profile
                        ? trim(($u->profile->first_name ?? '') . ' ' . ($u->profile->last_name ?? ''))
                        : '';
                    if ($name === '') {
                        $name = $u->email ?? ('User #' . $u->id);
                    }

                    return [
                        'key' => 'user-' . $u->id,
                        'path' => '/superadmin/users?search=' . rawurlencode($u->email ?? (string) $u->id),
                        'title' => $name,
                        'subtitle' => ($u->email ?? '') . ($u->role ? ' · ' . $u->role : ''),
                        'icon' => 'users',
                    ];
                })->values()->all(),
            ];
        }

        $advertisements = $this->searchAdvertisements($q);
        if ($advertisements->isNotEmpty()) {
            $sections[] = [
                'key' => 'advertisements',
                'items' => $advertisements->map(function (Advertisement $a) {
                    return [
                        'key' => 'advertisement-' . $a->id,
                        'path' => '/superadmin/advertisements',
                        'title' => $a->title,
                        'subtitle' => trim(($a->city ?? '') . ' ' . ($a->state ?? '')),
                        'icon' => 'advertisements',
                    ];
                })->values()->all(),
            ];
        }

        $categories = $this->searchCategories($q);
        if ($categories->isNotEmpty()) {
            $sections[] = [
                'key' => 'categories',
                'items' => $categories->map(function (ServiceCategory $cat) {
                    return [
                        'key' => 'category-' . $cat->id,
                        'path' => '/superadmin/categories',
                        'title' => $cat->name,
                        'subtitle' => $cat->description ? mb_substr(strip_tags($cat->description), 0, 80) : '',
                        'icon' => 'categories',
                    ];
                })->values()->all(),
            ];
        }

        $reviews = $this->searchReviews($q);
        if ($reviews->isNotEmpty()) {
            $sections[] = [
                'key' => 'reviews',
                'items' => $reviews->map(function (Review $r) {
                    $comment = $r->comment ? mb_substr(strip_tags($r->comment), 0, 100) : '';

                    return [
                        'key' => 'review-' . $r->id,
                        'path' => '/superadmin/reviews',
                        'title' => 'Review #' . $r->id,
                        'subtitle' => $comment,
                        'icon' => 'reviews',
                    ];
                })->values()->all(),
            ];
        }

        return response()->json(['sections' => $sections]);
    }

    private function searchCompanies(string $search)
    {
        return Company::with('owner.profile')
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                DatabaseHelper::whereLike($q, 'email', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'phone', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'slug', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'city', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'state', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'address', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or', true);
                DatabaseHelper::whereLike($q, 'category', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'zip_code', "%{$search}%", 'or');
                $q->orWhereHas('owner', function ($ownerQ) use ($search) {
                    DatabaseHelper::whereLike($ownerQ, 'email', "%{$search}%");
                });
            })
            ->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchUsers(string $search)
    {
        return User::with('profile')
            ->where(function ($q) use ($search) {
                if (ctype_digit($search)) {
                    $q->where('id', (int) $search);
                }
                $bool = ctype_digit($search) ? 'or' : 'and';
                DatabaseHelper::whereLike($q, 'email', "%{$search}%", $bool);
                $q->orWhereHas('profile', function ($profileQuery) use ($search) {
                    DatabaseHelper::whereLike($profileQuery, 'first_name', "%{$search}%");
                    DatabaseHelper::whereLike($profileQuery, 'last_name', "%{$search}%", 'or');
                    DatabaseHelper::whereLike($profileQuery, 'phone', "%{$search}%", 'or');
                    DatabaseHelper::whereLike($profileQuery, 'city', "%{$search}%", 'or');
                    DatabaseHelper::whereLike($profileQuery, 'address', "%{$search}%", 'or', true);
                });
            })
            ->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchAdvertisements(string $search)
    {
        return Advertisement::where(function ($q) use ($search) {
            DatabaseHelper::whereLike($q, 'title', "%{$search}%");
            DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or', true);
            DatabaseHelper::whereLike($q, 'city', "%{$search}%", 'or');
            DatabaseHelper::whereLike($q, 'state', "%{$search}%", 'or');
            DatabaseHelper::whereLike($q, 'link', "%{$search}%", 'or');
            DatabaseHelper::whereLike($q, 'category_slug', "%{$search}%", 'or');
        })
            ->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchCategories(string $search)
    {
        return ServiceCategory::where(function ($q) use ($search) {
            DatabaseHelper::whereLike($q, 'name', "%{$search}%");
            DatabaseHelper::whereLike($q, 'slug', "%{$search}%", 'or');
            DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or');
        })
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchReviews(string $search)
    {
        return Review::where(function ($q) use ($search) {
            if (ctype_digit($search)) {
                $q->where('id', (int) $search);
            }
            $bool = ctype_digit($search) ? 'or' : 'and';
            DatabaseHelper::whereLike($q, 'comment', "%{$search}%", $bool, true);
            DatabaseHelper::whereLike($q, 'response', "%{$search}%", 'or', true);
        })
            ->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();
    }
}
