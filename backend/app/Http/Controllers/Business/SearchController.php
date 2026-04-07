<?php

namespace App\Http\Controllers\Business;

use App\Helpers\DatabaseHelper;
use App\Http\Controllers\Controller;
use App\Models\Advertisement;
use App\Models\Booking;
use App\Models\PromoCode;
use App\Models\RecurringBookingChain;
use App\Models\Review;
use App\Models\Service;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SearchController extends Controller
{
    private const LIMIT = 15;

    /**
     * Быстрый поиск по данным текущей компании (тенант).
     */
    public function __invoke(Request $request)
    {
        $companyId = (int) $request->get('current_company_id', 0);
        if ($companyId < 1) {
            return response()->json(['sections' => []]);
        }

        $q = trim((string) $request->get('query', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['sections' => []]);
        }

        $sections = [];

        $clients = $this->searchClients($companyId, $q);
        if ($clients->isNotEmpty()) {
            $sections[] = [
                'key' => 'clients',
                'items' => $clients->map(function (User $user) {
                    $profile = $user->profile;
                    $name = $profile
                        ? trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? ''))
                        : '';
                    if ($name === '') {
                        $name = $user->email && !str_ends_with($user->email, '@local.local')
                            ? $user->email
                            : 'Client #' . $user->id;
                    }
                    $email = ($user->email && !str_ends_with($user->email, '@local.local'))
                        ? $user->email
                        : '';
                    $phone = $profile ? ($profile->phone ?? '') : '';

                    return [
                        'key' => 'client-' . $user->id,
                        'path' => '/business/clients/' . $user->id,
                        'title' => $name,
                        'subtitle' => trim(implode(' · ', array_filter([$email, $phone]))),
                        'icon' => 'customers',
                    ];
                })->values()->all(),
            ];
        }

        $bookings = $this->searchBookings($companyId, $q);
        if ($bookings->isNotEmpty()) {
            $sections[] = [
                'key' => 'bookings',
                'items' => $bookings->map(function (Booking $b) {
                    $date = $b->booking_date
                        ? $b->booking_date->format('Y-m-d')
                        : '';
                    $time = $b->booking_time ? substr((string) $b->booking_time, 0, 5) : '';
                    $client = $b->client_name ?: 'Guest';

                    return [
                        'key' => 'booking-' . $b->id,
                        'path' => '/business/bookings?bookingId=' . $b->id,
                        'title' => 'Booking #' . $b->id,
                        'subtitle' => trim($client . ' · ' . $date . ' ' . $time),
                        'icon' => 'calendar',
                    ];
                })->values()->all(),
            ];
        }

        $services = $this->searchServices($companyId, $q);
        if ($services->isNotEmpty()) {
            $sections[] = [
                'key' => 'services',
                'items' => $services->map(function (Service $s) {
                    return [
                        'key' => 'service-' . $s->id,
                        'path' => '/business/settings?tab=services',
                        'title' => $s->name,
                        'subtitle' => $s->description
                            ? mb_substr(strip_tags($s->description), 0, 80)
                            : '',
                        'icon' => 'products',
                    ];
                })->values()->all(),
            ];
        }

        $team = $this->searchTeam($companyId, $q);
        if ($team->isNotEmpty()) {
            $sections[] = [
                'key' => 'team',
                'items' => $team->map(function (TeamMember $m) {
                    return [
                        'key' => 'team-' . $m->id,
                        'path' => '/business/settings?tab=team',
                        'title' => $m->name,
                        'subtitle' => trim(implode(' · ', array_filter([$m->email, $m->phone]))),
                        'icon' => 'customers',
                    ];
                })->values()->all(),
            ];
        }

        $ads = $this->searchAdvertisements($companyId, $q);
        if ($ads->isNotEmpty()) {
            $sections[] = [
                'key' => 'advertisements',
                'items' => $ads->map(function (Advertisement $a) {
                    return [
                        'key' => 'ad-' . $a->id,
                        'path' => '/business/advertisements',
                        'title' => $a->title,
                        'subtitle' => trim(($a->city ?? '') . ' ' . ($a->state ?? '')),
                        'icon' => 'advertisements',
                    ];
                })->values()->all(),
            ];
        }

        $promos = $this->searchPromoCodes($companyId, $q);
        if ($promos->isNotEmpty()) {
            $sections[] = [
                'key' => 'promo_codes',
                'items' => $promos->map(function (PromoCode $p) {
                    return [
                        'key' => 'promo-' . $p->id,
                        'path' => '/business/discounts',
                        'title' => $p->code,
                        'subtitle' => $p->name ?: '',
                        'icon' => 'orders',
                    ];
                })->values()->all(),
            ];
        }

        $reviews = $this->searchReviews($companyId, $q);
        if ($reviews->isNotEmpty()) {
            $sections[] = [
                'key' => 'reviews',
                'items' => $reviews->map(function (Review $r) {
                    $comment = $r->comment ? mb_substr(strip_tags($r->comment), 0, 100) : '';

                    return [
                        'key' => 'review-' . $r->id,
                        'path' => '/business/reviews',
                        'title' => 'Review #' . $r->id,
                        'subtitle' => $comment,
                        'icon' => 'reviews',
                    ];
                })->values()->all(),
            ];
        }

        $chains = $this->searchRecurringChains($companyId, $q);
        if ($chains->isNotEmpty()) {
            $sections[] = [
                'key' => 'recurring',
                'items' => $chains->map(function (RecurringBookingChain $c) {
                    return [
                        'key' => 'recurring-' . $c->id,
                        'path' => '/business/schedule',
                        'title' => 'Recurring #' . $c->id,
                        'subtitle' => trim(($c->client_name ?: '') . ' · ' . ($c->frequency ?? '')),
                        'icon' => 'calendar',
                    ];
                })->values()->all(),
            ];
        }

        return response()->json(['sections' => $sections]);
    }

    private function searchClients(int $companyId, string $search)
    {
        $clientIdsFromTable = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->pluck('user_id');

        $clientIdsFromBookings = Booking::where('company_id', $companyId)
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');

        $clientIds = $clientIdsFromTable->merge($clientIdsFromBookings)->unique();

        $query = User::whereIn('id', $clientIds)
            ->where('role', 'CLIENT')
            ->with('profile');

        $query->where(function ($q) use ($search, $companyId) {
            $q->where(function ($emailQuery) use ($search) {
                DatabaseHelper::whereLike($emailQuery, 'email', "%{$search}%");
                $emailQuery->whereRaw("email NOT LIKE '%@local.local'");
            })
                ->orWhereHas('profile', function ($profileQuery) use ($search) {
                    DatabaseHelper::whereLike($profileQuery, 'first_name', "%{$search}%");
                    DatabaseHelper::whereLike($profileQuery, 'last_name', "%{$search}%", 'or');
                    DatabaseHelper::whereLike($profileQuery, 'phone', "%{$search}%", 'or');
                });

            if (Schema::hasTable('client_notes')) {
                $like = DatabaseHelper::ilike("%{$search}%");
                $q->orWhereIn('id', function ($sub) use ($companyId, $like) {
                    $sub->select('client_id')
                        ->from('client_notes')
                        ->where('company_id', $companyId)
                        ->whereRaw('note '.$like['operator'].' ?', [$like['value']]);
                });
            }
        });

        return $query->orderBy('id', 'desc')->limit(self::LIMIT)->get();
    }

    private function searchBookings(int $companyId, string $search)
    {
        $query = Booking::where('company_id', $companyId);

        $query->where(function ($q) use ($search) {
            if (ctype_digit($search)) {
                $q->where('id', (int) $search);
            }
            $bool = ctype_digit($search) ? 'or' : 'and';
            DatabaseHelper::whereLike($q, 'client_name', "%{$search}%", $bool);
            DatabaseHelper::whereLike($q, 'client_email', "%{$search}%", 'or');
            DatabaseHelper::whereLike($q, 'client_phone', "%{$search}%", 'or');
            DatabaseHelper::whereLike($q, 'title', "%{$search}%", 'or');
            DatabaseHelper::whereLike($q, 'notes', "%{$search}%", 'or', true);
            DatabaseHelper::whereLike($q, 'client_notes', "%{$search}%", 'or', true);
        });

        return $query->orderBy('booking_date', 'desc')->limit(self::LIMIT)->get();
    }

    private function searchServices(int $companyId, string $search)
    {
        return Service::where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                DatabaseHelper::whereLike($q, 'slug', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or');
            })
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchTeam(int $companyId, string $search)
    {
        return TeamMember::where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                DatabaseHelper::whereLike($q, 'email', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'phone', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'role', "%{$search}%", 'or');
            })
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchAdvertisements(int $companyId, string $search)
    {
        return Advertisement::where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'title', "%{$search}%");
                DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or');
            })
            ->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchPromoCodes(int $companyId, string $search)
    {
        return PromoCode::where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'code', "%{$search}%");
                DatabaseHelper::whereLike($q, 'name', "%{$search}%", 'or');
            })
            ->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchReviews(int $companyId, string $search)
    {
        return Review::where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'comment', "%{$search}%", 'and', true);
                DatabaseHelper::whereLike($q, 'response', "%{$search}%", 'or', true);
            })
            ->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();
    }

    private function searchRecurringChains(int $companyId, string $search)
    {
        return RecurringBookingChain::where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                if (ctype_digit($search)) {
                    $q->where('id', (int) $search);
                }
                $bool = ctype_digit($search) ? 'or' : 'and';
                DatabaseHelper::whereLike($q, 'client_name', "%{$search}%", $bool);
                DatabaseHelper::whereLike($q, 'client_email', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'client_phone', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'notes', "%{$search}%", 'or', true);
            })
            ->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();
    }
}
