<?php

namespace App\Http\Controllers\Business;

use App\Helpers\DatabaseHelper;
use App\Http\Controllers\Concerns\ResolvesKnowledgeLocale;
use App\Http\Controllers\Controller;
use App\Models\AdditionalService;
use App\Models\Advertisement;
use App\Models\Booking;
use App\Models\KnowledgeArticle;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\PersonalAccessToken;
use App\Models\PromoCode;
use App\Models\RecurringBookingChain;
use App\Models\Review;
use App\Models\Service;
use App\Models\SubscriptionPlan;
use App\Models\SupportTicket;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\SubscriptionLimitService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SearchController extends Controller
{
    use ResolvesKnowledgeLocale;

    private const LIMIT = 15;

    private const SECONDARY_LIMIT = 10;

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

        $routesNav = $this->routesNavigationShortcut($request, $companyId, $q);
        if ($routesNav !== null) {
            $sections[] = $routesNav;
        }

        $knowledge = $this->searchKnowledgeArticles($request, $q);
        if ($knowledge->isNotEmpty()) {
            $sections[] = [
                'key' => 'knowledge',
                'items' => $knowledge->map(function (KnowledgeArticle $article) {
                    $topic = $article->topic;
                    $topicSlug = $topic?->slug ?? 'topic';
                    $path = '/business/knowledge/'.$topicSlug.'/'.$article->slug;

                    return [
                        'key' => 'knowledge-article-'.$article->id,
                        'path' => $path,
                        'title' => $article->title,
                        'subtitle' => trim(implode(' · ', array_filter([
                            $topic?->title,
                            $article->excerpt ? mb_substr(strip_tags($article->excerpt), 0, 72) : null,
                        ]))),
                        'icon' => 'guide',
                    ];
                })->values()->all(),
            ];
        }

        $tickets = $this->searchSupportTickets($companyId, $q);
        if ($tickets->isNotEmpty()) {
            $sections[] = [
                'key' => 'support',
                'items' => $tickets->map(function (SupportTicket $t) {
                    return [
                        'key' => 'support-ticket-'.$t->id,
                        'path' => '/business/support?ticket='.$t->id,
                        'title' => $t->subject ?: 'Ticket #'.$t->id,
                        'subtitle' => trim(($t->category ?? '').' · '.($t->status ?? '')),
                        'icon' => 'support',
                    ];
                })->values()->all(),
            ];
        }

        $plans = $this->searchSubscriptionPlans($q);
        if ($plans->isNotEmpty()) {
            $sections[] = [
                'key' => 'subscription',
                'items' => $plans->map(function (SubscriptionPlan $plan) {
                    $desc = $plan->description ? mb_substr(strip_tags($plan->description), 0, 80) : '';

                    return [
                        'key' => 'subscription-plan-'.$plan->id,
                        'path' => '/business/subscription',
                        'title' => $plan->name,
                        'subtitle' => $desc,
                        'icon' => 'subscription',
                    ];
                })->values()->all(),
            ];
        }

        $apiTokens = $this->searchApiTokens($request, $companyId, $q);
        if ($apiTokens->isNotEmpty()) {
            $sections[] = [
                'key' => 'api_tokens',
                'items' => $apiTokens->map(function (PersonalAccessToken $token) {
                    return [
                        'key' => 'api-token-'.$token->id,
                        'path' => '/business/api',
                        'title' => $token->name,
                        'subtitle' => (string) ($token->token_prefix ?? ''),
                        'icon' => 'code',
                    ];
                })->values()->all(),
            ];
        }

        $payments = $this->searchPayments($companyId, $q);
        if ($payments->isNotEmpty()) {
            $sections[] = [
                'key' => 'payments',
                'items' => $payments->map(function (Payment $p) {
                    $amount = $p->amount !== null
                        ? number_format(((int) $p->amount) / 100, 2).' '.strtoupper((string) ($p->currency ?? 'USD'))
                        : '';
                    $bookingPart = $p->booking_id ? 'Booking #'.$p->booking_id : '';

                    return [
                        'key' => 'payment-'.$p->id,
                        'path' => '/business/billing',
                        'title' => 'Payment #'.$p->id,
                        'subtitle' => trim($bookingPart.($bookingPart && $amount ? ' · ' : '').$amount.' · '.($p->status ?? '')),
                        'icon' => 'billing',
                    ];
                })->values()->all(),
            ];
        }

        $notifications = $this->searchNotifications($request, $companyId, $q);
        if ($notifications->isNotEmpty()) {
            $sections[] = [
                'key' => 'notifications',
                'items' => $notifications->map(function (Notification $n) {
                    $path = $n->link && is_string($n->link) && str_starts_with($n->link, '/')
                        ? $n->link
                        : '/business/notifications';

                    return [
                        'key' => 'notification-'.$n->id,
                        'path' => $path,
                        'title' => $n->title ?: 'Notification #'.$n->id,
                        'subtitle' => $n->message ? mb_substr(strip_tags($n->message), 0, 100) : '',
                        'icon' => 'notifications',
                    ];
                })->values()->all(),
            ];
        }

        $addOns = $this->searchAdditionalServices($companyId, $q);
        if ($addOns->isNotEmpty()) {
            $sections[] = [
                'key' => 'additional_services',
                'items' => $addOns->map(function (AdditionalService $row) {
                    return [
                        'key' => 'addon-'.$row->id,
                        'path' => '/business/settings?tab=services',
                        'title' => $row->name,
                        'subtitle' => $row->description
                            ? mb_substr(strip_tags($row->description), 0, 80)
                            : '',
                        'icon' => 'products',
                    ];
                })->values()->all(),
            ];
        }

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

    /**
     * Подсказка-переход на страницу маршрутов при запросе по ключевым словам.
     *
     * @return array<string, mixed>|null
     */
    private function routesNavigationShortcut(Request $request, int $companyId, string $query): ?array
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return null;
        }

        $canView = $user->hasPermissionInCompany($companyId, 'view_routes')
            || $user->hasPermissionInCompany($companyId, 'view_schedule');
        if (! $canView) {
            return null;
        }

        $lower = Str::lower($query);
        $keywords = [
            'route', 'routes', 'routing', 'маршрут', 'маршруты', 'маршру', 'ruta', 'rutas', 'itinéraire', 'itineraire',
            'երթուղ', 'шлях', 'itiné', 'optimaliz', 'optimize',
        ];
        foreach ($keywords as $kw) {
            if ($kw !== '' && str_contains($lower, Str::lower($kw))) {
                return [
                    'key' => 'routes',
                    'items' => [[
                        'key' => 'nav-routes-page',
                        'path' => '/business/routes',
                        'title' => 'Routes',
                        'subtitle' => 'Daily routes & optimization',
                        'icon' => 'routes',
                    ]],
                ];
            }
        }

        return null;
    }

    private function searchClients(int $companyId, string $search)
    {
        $clientIdsFromTable = DB::table('company_clients')
            ->where('company_id', $companyId)
            ->pluck('user_id');

        $clientIdsFromBookings = Booking::where('company_id', $companyId)
            ->withoutPendingPayment()
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
        $query = Booking::where('company_id', $companyId)
            ->withoutPendingPayment();

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

    /**
     * @return \Illuminate\Support\Collection<int, KnowledgeArticle>
     */
    private function searchKnowledgeArticles(Request $request, string $search)
    {
        $locale = $this->resolveKnowledgeLocale($request);

        return KnowledgeArticle::with(['topic' => function ($q) {
            $q->select('id', 'slug', 'title', 'locale', 'is_published');
        }])
            ->where('locale', $locale)
            ->where('is_published', true)
            ->whereHas('topic', function ($t) use ($locale) {
                $t->where('is_published', true)->where('locale', $locale);
            })
            ->where(function ($query) use ($search) {
                DatabaseHelper::whereLike($query, 'title', "%{$search}%");
                DatabaseHelper::whereLike($query, 'excerpt', "%{$search}%", 'or', true);
                DatabaseHelper::whereLike($query, 'body', "%{$search}%", 'or', true);
            })
            ->orderBy('title')
            ->limit(self::SECONDARY_LIMIT)
            ->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, SupportTicket>
     */
    private function searchSupportTickets(int $companyId, string $search)
    {
        return SupportTicket::where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'subject', "%{$search}%");
                DatabaseHelper::whereLike($q, 'body', "%{$search}%", 'or', true);
                DatabaseHelper::whereLike($q, 'category', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'area_section', "%{$search}%", 'or');
            })
            ->orderByDesc('id')
            ->limit(self::SECONDARY_LIMIT)
            ->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, SubscriptionPlan>
     */
    private function searchSubscriptionPlans(string $search)
    {
        return SubscriptionPlan::query()
            ->where('is_active', true)
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                DatabaseHelper::whereLike($q, 'slug', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or', true);
                DatabaseHelper::whereLike($q, 'badge_text', "%{$search}%", 'or');
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->limit(self::SECONDARY_LIMIT)
            ->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, PersonalAccessToken>
     */
    private function searchApiTokens(Request $request, int $companyId, string $search)
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return collect();
        }
        if (! SubscriptionLimitService::hasAccess($companyId, 'api_access')) {
            return collect();
        }
        if (! $user->hasPermissionInCompany($companyId, 'manage_settings')) {
            return collect();
        }

        return PersonalAccessToken::query()
            ->where('tokenable_type', $user->getMorphClass())
            ->where('tokenable_id', $user->id)
            ->where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                DatabaseHelper::whereLike($q, 'token_prefix', "%{$search}%", 'or');
            })
            ->orderByDesc('id')
            ->limit(self::SECONDARY_LIMIT)
            ->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, Payment>
     */
    private function searchPayments(int $companyId, string $search)
    {
        return Payment::where('company_id', $companyId)
            ->where(function ($q) use ($search) {
                if (ctype_digit($search)) {
                    $sid = (int) $search;
                    $q->where('id', $sid)->orWhere('booking_id', $sid);
                }
                $bool = ctype_digit($search) ? 'or' : 'and';
                DatabaseHelper::whereLike($q, 'stripe_payment_intent_id', "%{$search}%", $bool);
                DatabaseHelper::whereLike($q, 'stripe_charge_id', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'stripe_transfer_id', "%{$search}%", 'or');
                DatabaseHelper::whereLike($q, 'status', "%{$search}%", 'or');
            })
            ->orderByDesc('id')
            ->limit(self::SECONDARY_LIMIT)
            ->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, Notification>
     */
    private function searchNotifications(Request $request, int $companyId, string $search)
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return collect();
        }

        return Notification::query()
            ->where('user_id', $user->id)
            ->where(function ($q) use ($companyId) {
                $q->whereNull('company_id')
                    ->orWhere('company_id', $companyId);
            })
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'title', "%{$search}%");
                DatabaseHelper::whereLike($q, 'message', "%{$search}%", 'or', true);
                DatabaseHelper::whereLike($q, 'type', "%{$search}%", 'or');
            })
            ->orderByDesc('id')
            ->limit(self::SECONDARY_LIMIT)
            ->get();
    }

    /**
     * @return \Illuminate\Support\Collection<int, AdditionalService>
     */
    private function searchAdditionalServices(int $companyId, string $search)
    {
        return AdditionalService::query()
            ->whereHas('service', function ($q) use ($companyId) {
                $q->where('company_id', $companyId);
            })
            ->where(function ($q) use ($search) {
                DatabaseHelper::whereLike($q, 'name', "%{$search}%");
                DatabaseHelper::whereLike($q, 'description', "%{$search}%", 'or', true);
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->limit(self::SECONDARY_LIMIT)
            ->get();
    }
}
