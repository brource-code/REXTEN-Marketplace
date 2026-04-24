<?php

namespace App\Console\Commands;

use App\Models\Advertisement;
use App\Models\Booking;
use App\Models\BookingLocation;
use App\Models\Company;
use App\Models\DiscountTier;
use App\Models\PromoCode;
use App\Models\Review;
use App\Models\Route;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\DemoPresentationSubscriptionService;
use App\Services\Routing\RouteOrchestrator;
use Carbon\Carbon;
use Database\Seeders\DemoRextenPro\DemoRextenProDataset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DemoSeedBusinessCommand extends Command
{
    protected $signature = 'demo:seed-business
        {--owner-email=demo@rexten.pro : Email владельца компании (BUSINESS_OWNER)}
        {--force : Удалить предыдущие demo-seed данные этой компании и создать заново}';

    protected $description = 'Наполняет демо-аккаунт клининга: выезд offsite, маршруты, клиенты, брони (апр–июнь), скидки, объявления, отзывы.';

    private const CLIENT_COUNT = 60;

    /** Все брони — клининг (offsite). */
    private const BOOKING_TOTAL = 96;

    /** Порог идемпотентности: если столько demo-броней уже есть — пропуск без --force. */
    private const IDEMPOTENT_MIN_BOOKINGS = 50;

    public function handle(): int
    {
        $email = (string) $this->option('owner-email');
        $owner = User::query()->where('email', $email)->first();
        if ($owner === null) {
            $this->error("Пользователь с email {$email} не найден.");

            return self::FAILURE;
        }

        $company = $owner->ownedCompanies()->orderBy('id')->first();
        if ($company === null) {
            if (! $owner->isBusinessOwner()) {
                $this->error('Пользователь не BUSINESS_OWNER — создайте компанию вручную или смените роль.');

                return self::FAILURE;
            }
            $company = Company::query()->create([
                'owner_id' => $owner->id,
                'name' => 'LA Home & Glow',
                'slug' => 'la-home-glow-'.$owner->id,
                'description' => 'Professional home cleaning across Los Angeles (demo).',
                'address' => DemoRextenProDataset::SALON_ADDRESS,
                'city' => DemoRextenProDataset::SALON_CITY,
                'state' => DemoRextenProDataset::SALON_STATE,
                'zip_code' => DemoRextenProDataset::SALON_ZIP,
                'timezone' => DemoRextenProDataset::TIMEZONE,
                'latitude' => (string) DemoRextenProDataset::SALON_LAT,
                'longitude' => (string) DemoRextenProDataset::SALON_LNG,
                'status' => 'active',
                'is_visible_on_marketplace' => true,
            ]);
            $this->warn('Создана новая компания для владельца (не было записи в ownedCompanies).');
        }

        $marker = DemoRextenProDataset::DEMO_BOOKING_MARKER;
        $existingDemoBookings = Booking::query()
            ->where('company_id', $company->id)
            ->where('notes', 'like', '%'.$marker.'%')
            ->count();

        if ($existingDemoBookings >= self::IDEMPOTENT_MIN_BOOKINGS && ! $this->option('force')) {
            DemoPresentationSubscriptionService::ensureStarterForDemoCompany((int) $company->id);
            $this->info("Уже есть {$existingDemoBookings} demo-броней. Пропуск полного сида (используйте --force). Подписка демо для нескольких исполнителей приведена в порядок.");

            return self::SUCCESS;
        }

        if ($this->option('force')) {
            $this->warn('Удаление предыдущих demo-seed данных…');
            $this->rollbackDemoData($company->id);
        }

        $this->seedCore($company);
        $this->seedTeam($company);
        DemoPresentationSubscriptionService::ensureStarterForDemoCompany((int) $company->id);
        $clients = $this->seedClients($company);
        $services = $this->seedServices($company);
        $team = TeamMember::query()->where('company_id', $company->id)->orderBy('id')->get();
        $cleaners = $team->filter(fn (TeamMember $m) => str_contains((string) $m->email, 'cleaner'))->values();
        if ($cleaners->count() < 2) {
            $this->error('Ожидались 2 клинера по email-маркерам (cleaner1/cleaner2).');

            return self::FAILURE;
        }

        $this->seedDiscounts($company);
        $this->seedAdvertisements($company, $services, $team);
        $bookingMeta = $this->seedBookings(
            $company,
            $clients,
            $services,
            $cleaners,
            $marker
        );
        $this->seedClientNotes($company->id, $clients);
        $this->seedReviews($company, $bookingMeta['completed_ids']);
        $this->seedRoutes($company->id, $cleaners, $bookingMeta['cleaning_dates']);

        $this->info('Готово. Проверьте бизнес-админку под '.$email.'.');

        return self::SUCCESS;
    }

    private function rollbackDemoData(int $companyId): void
    {
        $marker = DemoRextenProDataset::DEMO_BOOKING_MARKER;
        $demoBookingIds = Booking::query()
            ->where('company_id', $companyId)
            ->where('notes', 'like', '%'.$marker.'%')
            ->pluck('id')
            ->all();

        DB::transaction(function () use ($companyId, $demoBookingIds, $marker): void {
            if ($demoBookingIds !== []) {
                Review::query()->whereIn('booking_id', $demoBookingIds)->delete();
                if (Schema::hasTable('promo_code_usages')) {
                    DB::table('promo_code_usages')->whereIn('booking_id', $demoBookingIds)->delete();
                }
                Booking::query()->whereIn('id', $demoBookingIds)->delete();
            }

            Route::query()->where('company_id', $companyId)->delete();

            $demoClientIds = User::query()
                ->where('email', 'like', 'rexten_demo_c_%@clients.rexten.demo')
                ->pluck('id')
                ->all();
            if ($demoClientIds !== [] && Schema::hasTable('client_notes')) {
                DB::table('client_notes')
                    ->where('company_id', $companyId)
                    ->whereIn('client_id', $demoClientIds)
                    ->delete();
            }
            DB::table('company_clients')
                ->where('company_id', $companyId)
                ->whereIn('user_id', $demoClientIds)
                ->delete();

            User::withTrashed()->whereIn('id', $demoClientIds)->forceDelete();

            TeamMember::query()
                ->where('company_id', $companyId)
                ->where('email', 'like', '%@demo.rexten.internal')
                ->delete();

            Service::query()
                ->where('company_id', $companyId)
                ->where('slug', 'like', 'demo-rp-%')
                ->delete();

            DiscountTier::query()->where('company_id', $companyId)->where('name', 'like', 'Demo %')->delete();
            PromoCode::query()->where('company_id', $companyId)->where('code', 'like', 'DEMO%')->delete();

            Advertisement::query()
                ->where('company_id', $companyId)
                ->where('link', 'like', 'demo-rp-%')
                ->delete();
        });
    }

    private function seedCore(Company $company): void
    {
        $company->update([
            'name' => $company->name ?: 'LA Home & Glow',
            'description' => 'Professional residential cleaning across Los Angeles — deep cleans, maintenance visits, and post-renovation resets. Fully insured crews and route-optimized teams.',
            'address' => DemoRextenProDataset::SALON_ADDRESS,
            'city' => DemoRextenProDataset::SALON_CITY,
            'state' => DemoRextenProDataset::SALON_STATE,
            'zip_code' => DemoRextenProDataset::SALON_ZIP,
            'timezone' => DemoRextenProDataset::TIMEZONE,
            'latitude' => (string) DemoRextenProDataset::SALON_LAT,
            'longitude' => (string) DemoRextenProDataset::SALON_LNG,
            'phone' => '+1 (555) 010-0142',
            'email' => DemoRextenProDataset::OWNER_EMAIL_DEFAULT,
            'website' => 'https://example.org/la-home-glow-demo',
            'status' => 'active',
            'is_visible_on_marketplace' => true,
            'show_in_search' => true,
            'allow_booking' => true,
            'show_reviews' => true,
            'show_portfolio' => true,
            'seo_title' => 'LA Home & Glow — Home Cleaning',
            'seo_description' => 'Book deep and maintenance cleaning across Los Angeles. Same-day routing for busy households.',
            'meta_keywords' => 'los angeles cleaning, deep clean, house cleaning, maintenance',
            'loyalty_booking_count_rule' => 'completed',
            'notification_email_enabled' => true,
            'notification_new_bookings' => true,
            'notification_cancellations' => true,
            'notification_payments' => true,
            'notification_reviews' => true,
        ]);
    }

    private function seedTeam(Company $company): void
    {
        $base = [
            'company_id' => $company->id,
            'status' => 'active',
            'phone' => '+1 (555) 010-0900',
        ];

        $rows = [
            array_merge($base, [
                'name' => 'Jordan Lee',
                'email' => DemoRextenProDataset::teamEmail('cleaner', 1),
                'role' => 'Mobile cleaning lead',
                'home_address' => DemoRextenProDataset::CLEANER_DEPOT_1_ADDRESS,
                'home_latitude' => DemoRextenProDataset::CLEANER_DEPOT_1_LAT,
                'home_longitude' => DemoRextenProDataset::CLEANER_DEPOT_1_LNG,
                'sort_order' => 1,
            ]),
            array_merge($base, [
                'name' => 'Sam Rivera',
                'email' => DemoRextenProDataset::teamEmail('cleaner', 2),
                'role' => 'Mobile cleaning',
                'home_address' => DemoRextenProDataset::CLEANER_DEPOT_2_ADDRESS,
                'home_latitude' => DemoRextenProDataset::CLEANER_DEPOT_2_LAT,
                'home_longitude' => DemoRextenProDataset::CLEANER_DEPOT_2_LNG,
                'sort_order' => 2,
            ]),
        ];

        TeamMember::query()
            ->where('company_id', $company->id)
            ->where('email', 'like', '%stylist%@demo.rexten.internal')
            ->delete();

        foreach ($rows as $row) {
            TeamMember::query()->updateOrCreate(
                ['company_id' => $company->id, 'email' => $row['email']],
                $row
            );
        }
    }

    private function seedClients(Company $company): array
    {
        $points = DemoRextenProDataset::laVisitPoints();
        $clients = [];
        for ($i = 1; $i <= self::CLIENT_COUNT; $i++) {
            $p = $points[($i - 1) % count($points)];
            $email = DemoRextenProDataset::clientEmail($i);
            $user = User::withTrashed()->where('email', $email)->first();
            if ($user === null) {
                $user = User::query()->create([
                    'email' => $email,
                    'password' => Hash::make(Str::random(32)),
                    'role' => 'CLIENT',
                    'is_active' => true,
                    'client_status' => $i % 5 === 0 ? 'vip' : ($i % 7 === 0 ? 'permanent' : 'regular'),
                ]);
            } else {
                if ($user->trashed()) {
                    $user->restore();
                }
                $user->forceFill([
                    'role' => 'CLIENT',
                    'is_active' => true,
                    'client_status' => $i % 5 === 0 ? 'vip' : ($i % 7 === 0 ? 'permanent' : 'regular'),
                ])->save();
            }

            $full = $this->fakeName($i);
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'first_name' => $full['first'],
                    'last_name' => $full['last'],
                    'phone' => DemoRextenProDataset::fakePhoneUs($i),
                    'address' => $p['address'].', USA',
                    'city' => $p['city'],
                    'state' => $p['state'],
                    'zip_code' => $p['zip'],
                ]
            );

            DB::table('company_clients')->insertOrIgnore([
                'company_id' => $company->id,
                'user_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $clients[] = $user;
        }

        return $clients;
    }

    /** @return array{cleaning: Service, maintenance: Service, premium: Service} */
    private function seedServices(Company $company): array
    {
        $catClean = ServiceCategory::query()->where('slug', 'cleaning')->firstOrFail();
        $suffix = $company->id;

        $cleaningDeep = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-deep-clean-'.$suffix],
            [
                'category_id' => $catClean->id,
                'name' => 'Deep home clean (visit)',
                'description' => 'Deep cleaning at your location — kitchens, baths, floors, detail work.',
                'price' => 449,
                'duration_minutes' => 200,
                'service_type' => 'offsite',
                'is_active' => true,
                'sort_order' => 1,
            ]
        );
        $cleaningMaint = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-maint-clean-'.$suffix],
            [
                'category_id' => $catClean->id,
                'name' => 'Maintenance clean (visit)',
                'description' => 'Regular upkeep visit for busy households.',
                'price' => 189,
                'duration_minutes' => 120,
                'service_type' => 'offsite',
                'is_active' => true,
                'sort_order' => 2,
            ]
        );
        $postReno = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-post-reno-'.$suffix],
            [
                'category_id' => $catClean->id,
                'name' => 'Post-renovation reset (visit)',
                'description' => 'Dust control, detail vacuum, and surface reset after remodel work.',
                'price' => 725,
                'duration_minutes' => 240,
                'service_type' => 'offsite',
                'is_active' => true,
                'sort_order' => 3,
            ]
        );

        return [
            'cleaning' => $cleaningDeep,
            'maintenance' => $cleaningMaint,
            'premium' => $postReno,
        ];
    }

    private function seedDiscounts(Company $company): void
    {
        DiscountTier::query()->updateOrCreate(
            ['company_id' => $company->id, 'name' => 'Demo Starter'],
            [
                'min_bookings' => 0,
                'max_bookings' => 4,
                'discount_type' => 'percentage',
                'discount_value' => 5,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );
        DiscountTier::query()->updateOrCreate(
            ['company_id' => $company->id, 'name' => 'Demo Regular'],
            [
                'min_bookings' => 5,
                'max_bookings' => 14,
                'discount_type' => 'percentage',
                'discount_value' => 10,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );
        DiscountTier::query()->updateOrCreate(
            ['company_id' => $company->id, 'name' => 'Demo VIP'],
            [
                'min_bookings' => 15,
                'max_bookings' => null,
                'discount_type' => 'percentage',
                'discount_value' => 15,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        PromoCode::query()->updateOrCreate(
            ['company_id' => $company->id, 'code' => 'DEMOWELCOME'],
            [
                'name' => 'Demo welcome',
                'description' => '10% off for demo viewers',
                'discount_type' => 'percentage',
                'discount_value' => 10,
                'min_order_amount' => 120,
                'max_discount_amount' => 40,
                'usage_limit' => 500,
                'usage_per_user' => 3,
                'used_count' => 0,
                'valid_from' => now()->subMonth(),
                'valid_until' => now()->addYear(),
                'is_active' => true,
            ]
        );
        PromoCode::query()->updateOrCreate(
            ['company_id' => $company->id, 'code' => 'DEMO15'],
            [
                'name' => 'Demo fixed',
                'description' => '$15 off',
                'discount_type' => 'fixed',
                'discount_value' => 15,
                'min_order_amount' => 180,
                'max_discount_amount' => 15,
                'usage_limit' => 200,
                'usage_per_user' => 1,
                'used_count' => 0,
                'valid_from' => now()->subWeeks(2),
                'valid_until' => now()->addMonths(6),
                'is_active' => true,
            ]
        );
    }

    /**
     * @param  array<string, Service>  $services
     * @param  \Illuminate\Support\Collection<int, TeamMember>  $team
     */
    private function seedAdvertisements(Company $company, array $services, $team): void
    {
        Advertisement::query()
            ->where('company_id', $company->id)
            ->where('link', 'like', 'demo-rp-salon-%')
            ->delete();

        $teamIds = $team->pluck('id')->values()->all();
        $schedule = [
            'monday' => ['enabled' => true, 'from' => '08:00', 'to' => '19:00', 'duration' => 60],
            'tuesday' => ['enabled' => true, 'from' => '08:00', 'to' => '19:00', 'duration' => 60],
            'wednesday' => ['enabled' => true, 'from' => '08:00', 'to' => '19:00', 'duration' => 60],
            'thursday' => ['enabled' => true, 'from' => '08:00', 'to' => '19:00', 'duration' => 60],
            'friday' => ['enabled' => true, 'from' => '08:00', 'to' => '19:00', 'duration' => 60],
            'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '17:00', 'duration' => 60],
            'sunday' => ['enabled' => false],
        ];

        Advertisement::query()->updateOrCreate(
            ['company_id' => $company->id, 'link' => 'demo-rp-marketplace-home-'.$company->id],
            [
                'type' => 'regular',
                'title' => 'LA Home & Glow — home cleaning across LA',
                'description' => 'Deep cleans, maintenance visits, and post-renovation resets — crews routed for same-day efficiency.',
                'image' => 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'services',
                'city' => 'Los Angeles',
                'state' => 'CA',
                'start_date' => now()->subMonth(),
                'end_date' => now()->addYear(),
                'is_active' => true,
                'status' => 'approved',
                'priority' => 10,
                'services' => [
                    ['id' => $services['cleaning']->id, 'name' => $services['cleaning']->name, 'price' => (float) $services['cleaning']->price, 'duration' => $services['cleaning']->duration_minutes],
                    ['id' => $services['maintenance']->id, 'name' => $services['maintenance']->name, 'price' => (float) $services['maintenance']->price, 'duration' => $services['maintenance']->duration_minutes],
                    ['id' => $services['premium']->id, 'name' => $services['premium']->name, 'price' => (float) $services['premium']->price, 'duration' => $services['premium']->duration_minutes],
                ],
                'team' => $teamIds,
                'portfolio' => DemoRextenProDataset::advertisementPortfolioCleaning(),
                'schedule' => $schedule,
                'slot_step_minutes' => 30,
                'price_from' => 189,
                'price_to' => 725,
                'currency' => 'USD',
                'category_slug' => 'cleaning',
            ]
        );
    }

    /**
     * Окно дат: апрель–июнь текущего года; не раньше сегодня. Если уже после 30 июня — следующий год Q2.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function demoCleaningDateWindow(): array
    {
        $tz = DemoRextenProDataset::TIMEZONE;
        $now = Carbon::now($tz)->startOfDay();
        $year = (int) $now->format('Y');
        $juneEnd = Carbon::create($year, 6, 30, 0, 0, 0, $tz);

        if ($now->gt($juneEnd)) {
            $year++;
            $windowStart = Carbon::create($year, 4, 1, 0, 0, 0, $tz);
            $june30 = Carbon::create($year, 6, 30, 0, 0, 0, $tz);

            return [$windowStart, $june30];
        }

        $apr1 = Carbon::create($year, 4, 1, 0, 0, 0, $tz);
        $windowStart = $now->copy();
        if ($windowStart->lt($apr1)) {
            $windowStart = $apr1->copy();
        }

        return [$windowStart, $juneEnd];
    }

    /**
     * Статус бронирования с учётом даты: completed / cancelled только если дата уже прошла.
     * Будущие записи — confirmed / pending / new.
     */
    private function demoBookingStatus(int $index, string $bookingDate): string
    {
        $isPast = $bookingDate <= now()->format('Y-m-d');
        $r = $index % 10;

        if ($isPast) {
            if ($r < 5) {
                return 'completed';
            }
            if ($r < 7) {
                return 'confirmed';
            }
            if ($r < 9) {
                return 'completed';
            }
            return 'cancelled';
        }

        if ($r < 5) {
            return 'confirmed';
        }
        if ($r < 8) {
            return 'pending';
        }
        if ($r < 9) {
            return 'new';
        }
        return 'cancelled';
    }

    /**
     * @param  array<int, User>  $clients
     * @param  \Illuminate\Support\Collection<int, TeamMember>  $cleaners
     * @return array{completed_ids: array<int, int>, cleaning_dates: array<string, array<int, string>>}
     */
    private function seedBookings(
        Company $company,
        array $clients,
        array $services,
        $cleaners,
        string $marker
    ): array {
        $points = DemoRextenProDataset::laVisitPoints();
        $svcCycle = [$services['cleaning'], $services['maintenance'], $services['premium']];
        $completedIds = [];
        $cleaningDates = [];

        Booking::withoutEvents(function () use (
            $company,
            $clients,
            $cleaners,
            $marker,
            $points,
            $svcCycle,
            &$completedIds,
            &$cleaningDates
        ): void {
            [$windowStart, $juneEnd] = $this->demoCleaningDateWindow();
            $dateList = [];
            for ($d = $windowStart->copy(); $d->lte($juneEnd); $d->addDay()) {
                $dateList[] = $d->format('Y-m-d');
            }
            if ($dateList === []) {
                return;
            }

            // Воспроизводимый «живой» разброс: разное число броней в день, пустые дни, разное время.
            mt_srand((int) ($company->id * 1_103_515_245 + (int) $windowStart->format('Ymd')));

            $tz = DemoRextenProDataset::TIMEZONE;
            $weights = [];
            foreach ($dateList as $dateStr) {
                $weights[] = Carbon::parse($dateStr, $tz)->isWeekend() ? 38 : 100;
            }
            $wSum = array_sum($weights);
            $counts = array_fill_keys($dateList, 0);
            for ($t = 0; $t < self::BOOKING_TOTAL; $t++) {
                $pick = mt_rand(1, $wSum);
                $acc = 0;
                foreach ($dateList as $idx => $dateStr) {
                    $acc += $weights[$idx];
                    if ($pick <= $acc) {
                        $counts[$dateStr]++;
                        break;
                    }
                }
            }

            $cleanIdx = 0;
            foreach ($dateList as $date) {
                $n = $counts[$date];
                if ($n <= 0) {
                    continue;
                }

                $daySlots = [];
                for ($k = 0; $k < $n; $k++) {
                    // Окно 08:00–17:30 старта (минуты от полуночи)
                    $daySlots[] = 8 * 60 + mt_rand(0, (9 * 60) + 30);
                }
                sort($daySlots);
                for ($k = 1; $k < $n; $k++) {
                    if ($daySlots[$k] <= $daySlots[$k - 1]) {
                        $daySlots[$k] = min(17 * 60 + 45, $daySlots[$k - 1] + mt_rand(20, 95));
                    }
                }

                foreach ($daySlots as $slotIdx => $startMin) {
                    $i = $cleanIdx;
                    $client = $clients[mt_rand(0, count($clients) - 1)];
                    $svc = $svcCycle[($i + $slotIdx + mt_rand(0, 2)) % count($svcCycle)];
                    $spec = $cleaners[mt_rand(0, $cleaners->count() - 1)];
                    $p = $points[mt_rand(0, count($points) - 1)];
                    $hour = intdiv((int) $startMin, 60);
                    $minute = (int) $startMin % 60;
                    $timeStr = sprintf('%02d:%02d:00', $hour, $minute);
                    $status = $this->demoBookingStatus($i, $date);
                    $price = (float) $svc->price;
                    $notes = 'Offsite clean — '.$p['label'].'. '.$marker;

                    $booking = Booking::query()->create([
                        'company_id' => $company->id,
                        'user_id' => $client->id,
                        'service_id' => $svc->id,
                        'execution_type' => 'offsite',
                        'specialist_id' => $spec->id,
                        'booking_date' => $date.' 00:00:00',
                        'booking_time' => $timeStr,
                        'duration_minutes' => $svc->duration_minutes,
                        'price' => $price,
                        'total_price' => $price,
                        'status' => $status,
                        'notes' => $notes,
                        'cached_lat' => $p['lat'],
                        'cached_lng' => $p['lng'],
                        'geocoded_at' => now(),
                    ]);

                    BookingLocation::query()->create([
                        'booking_id' => $booking->id,
                        'type' => 'client',
                        'address_line1' => $p['address'],
                        'city' => $p['city'],
                        'state' => $p['state'],
                        'zip' => $p['zip'],
                        'lat' => $p['lat'],
                        'lng' => $p['lng'],
                        'notes' => 'Public POI visit (demo)',
                    ]);

                    if ($status === 'completed') {
                        $completedIds[] = $booking->id;
                    }
                    $key = (string) $spec->id;
                    if (! isset($cleaningDates[$key])) {
                        $cleaningDates[$key] = [];
                    }
                    $cleaningDates[$key][$date] = $date;
                    $cleanIdx++;
                }
            }
        });

        return [
            'completed_ids' => $completedIds,
            'cleaning_dates' => $cleaningDates,
        ];
    }

    private function seedClientNotes(int $companyId, array $clients): void
    {
        if (! Schema::hasTable('client_notes')) {
            return;
        }
        $samples = [
            'Prefers morning visits; parking validation at lobby.',
            'Allergic to strong bleach — use unscented products.',
            'Often books deep clean + maintenance on rotation.',
            'VIP demo — show loyalty tier progress.',
        ];
        foreach ([0, 5, 12, 20, 33, 41] as $idx => $clientIndex) {
            if (! isset($clients[$clientIndex])) {
                continue;
            }
            DB::table('client_notes')->insert([
                'client_id' => $clients[$clientIndex]->id,
                'company_id' => $companyId,
                'note' => $samples[$idx % count($samples)].' [demo-seed]',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * @param  array<int, int>  $completedIds
     */
    private function seedReviews(Company $company, array $completedIds): void
    {
        $ids = array_slice($completedIds, 0, min(14, count($completedIds)));
        $comments = [
            'Great crew — place smelled amazing after the deep clean.',
            'On time and professional. Will book again.',
            'Post-renovation dust was gone — worth the premium visit.',
            'Maintenance visits keep our place guest-ready every week.',
            'Solid service for a busy week.',
        ];
        foreach ($ids as $i => $bid) {
            $b = Booking::query()->with('service')->find($bid);
            if ($b === null || $b->user_id === null) {
                continue;
            }
            Review::query()->updateOrCreate(
                [
                    'booking_id' => $bid,
                    'user_id' => $b->user_id,
                ],
                [
                    'company_id' => $company->id,
                    'service_id' => $b->service_id,
                    'rating' => 4 + ($i % 2),
                    'comment' => $comments[$i % count($comments)],
                    'is_visible' => true,
                    'response' => $i % 3 === 0 ? 'Thank you for visiting LA Home & Glow!' : null,
                    'response_at' => $i % 3 === 0 ? now()->subDays(2) : null,
                ]
            );
        }
    }

    /**
     * @param  array<string, array<int, string>>  $cleaningDates
     * @param  \Illuminate\Support\Collection<int, TeamMember>  $cleaners
     */
    private function seedRoutes(int $companyId, $cleaners, array $cleaningDates): void
    {
        $orchestrator = app(RouteOrchestrator::class);
        foreach ($cleaners as $cleaner) {
            $dates = $cleaningDates[(string) $cleaner->id] ?? [];
            foreach ($dates as $date) {
                $count = Booking::query()
                    ->where('company_id', $companyId)
                    ->where('specialist_id', $cleaner->id)
                    ->whereDate('booking_date', $date)
                    ->where('execution_type', 'offsite')
                    ->where('status', '!=', 'cancelled')
                    ->count();
                if ($count < 2) {
                    continue;
                }
                try {
                    $orchestrator->optimizeAndSave((int) $cleaner->id, $date, $companyId, true);
                    $this->line("Маршрут: specialist {$cleaner->id} / {$date}");
                } catch (\Throwable $e) {
                    $this->warn("Маршрут {$cleaner->id} / {$date}: ".$e->getMessage());
                }
            }
        }
    }

    private function fakeName(int $seed): array
    {
        $first = ['Alex', 'Jamie', 'Taylor', 'Riley', 'Casey', 'Quinn', 'Drew', 'Skyler', 'Reese', 'Cameron'];
        $last = ['Nguyen', 'Garcia', 'Kim', 'Martinez', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Anderson'];

        return [
            'first' => $first[$seed % count($first)],
            'last' => $last[($seed * 3) % count($last)],
        ];
    }
}
