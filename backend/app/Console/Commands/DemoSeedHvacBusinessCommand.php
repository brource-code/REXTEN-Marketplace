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
use App\Services\Routing\RouteOrchestrator;
use Carbon\Carbon;
use Database\Seeders\DemoRextenPro\DemoRextenProDataset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DemoSeedHvacBusinessCommand extends Command
{
    protected $signature = 'demo:seed-hvac-business
        {--owner-email=demo-hvac@rexten.pro : Email владельца компании (BUSINESS_OWNER)}
        {--force : Удалить предыдущие demo-seed данные этой компании и создать заново}
        {--create-owner : Создать владельца BUSINESS_OWNER, если пользователя с таким email нет}';

    protected $description = 'Наполняет демо-аккаунт HVAC: выезд offsite, маршруты, клиенты, брони (апр–июнь), скидки, объявления, отзывы.';

    private const CLIENT_COUNT = 54;

    private const BOOKING_TOTAL = 88;

    private const IDEMPOTENT_MIN_BOOKINGS = 45;

    private const DEMO_OWNER_PLAIN_PASSWORD = 'demo12345';

    public function handle(): int
    {
        $email = (string) $this->option('owner-email');
        $owner = User::query()->where('email', $email)->first();

        if ($owner === null) {
            if (! $this->option('create-owner')) {
                $this->error("Пользователь с email {$email} не найден. Создайте владельца вручную или запустите с --create-owner.");

                return self::FAILURE;
            }
            $owner = User::query()->create([
                'email' => $email,
                'password' => self::DEMO_OWNER_PLAIN_PASSWORD,
                'role' => 'BUSINESS_OWNER',
                'is_active' => true,
            ]);
            $this->warn('Создан владелец BUSINESS_OWNER. Пароль для входа: '.self::DEMO_OWNER_PLAIN_PASSWORD.' (смените на проде).');
        }

        $company = $owner->ownedCompanies()->orderBy('id')->first();
        if ($company === null) {
            if (! $owner->isBusinessOwner()) {
                $this->error('Пользователь не BUSINESS_OWNER — смените роль или создайте компанию.');

                return self::FAILURE;
            }
            $company = Company::query()->create([
                'owner_id' => $owner->id,
                'name' => 'LA Comfort Air & Heat',
                'slug' => 'la-comfort-air-heat-'.$owner->id,
                'description' => 'Residential HVAC — tune-ups, heating safety checks, duct cleaning (demo).',
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
            $this->warn('Создана новая компания для владельца.');
        }

        $marker = DemoRextenProDataset::DEMO_BOOKING_MARKER;
        $existingDemoBookings = Booking::query()
            ->where('company_id', $company->id)
            ->where('notes', 'like', '%'.$marker.'%')
            ->count();

        if ($existingDemoBookings >= self::IDEMPOTENT_MIN_BOOKINGS && ! $this->option('force')) {
            $this->info("Уже есть {$existingDemoBookings} demo-броней. Пропуск (используйте --force).");

            return self::SUCCESS;
        }

        if ($this->option('force')) {
            $this->warn('Удаление предыдущих demo-hvac-seed данных…');
            $this->rollbackHvacDemoData($company->id);
        }

        $this->seedCore($company, $email);
        $this->seedTeam($company);
        $clients = $this->seedClients($company);
        $services = $this->seedServices($company);
        $team = TeamMember::query()->where('company_id', $company->id)->orderBy('sort_order')->orderBy('id')->get();
        $techs = $team->filter(fn (TeamMember $m) => str_contains((string) $m->email, 'demo.team.hvac.'))->values();
        if ($techs->count() < 2) {
            $this->error('Ожидались 2 техника HVAC (email demo.team.hvac.*).');

            return self::FAILURE;
        }

        $this->seedDiscounts($company);
        $this->seedAdvertisements($company, $services, $team);
        $bookingMeta = $this->seedBookings($company, $clients, $services, $techs, $marker);
        $this->seedClientNotes($company->id, $clients);
        $this->seedReviews($company, $bookingMeta['completed_ids']);
        $this->seedRoutes($company->id, $techs, $bookingMeta['route_dates']);

        $this->info('Готово. Бизнес-админка HVAC: '.$email);

        return self::SUCCESS;
    }

    private function rollbackHvacDemoData(int $companyId): void
    {
        $marker = DemoRextenProDataset::DEMO_BOOKING_MARKER;
        $demoBookingIds = Booking::query()
            ->where('company_id', $companyId)
            ->where('notes', 'like', '%'.$marker.'%')
            ->pluck('id')
            ->all();

        $hvacClientIds = User::query()
            ->where('email', 'like', 'rexten_demo_h_%@clients.rexten.demo')
            ->pluck('id')
            ->all();

        DB::transaction(function () use ($companyId, $demoBookingIds, $hvacClientIds): void {
            if ($demoBookingIds !== []) {
                Review::query()->whereIn('booking_id', $demoBookingIds)->delete();
                if (Schema::hasTable('promo_code_usages')) {
                    DB::table('promo_code_usages')->whereIn('booking_id', $demoBookingIds)->delete();
                }
                Booking::query()->whereIn('id', $demoBookingIds)->delete();
            }

            Route::query()->where('company_id', $companyId)->delete();

            if ($hvacClientIds !== [] && Schema::hasTable('client_notes')) {
                DB::table('client_notes')
                    ->where('company_id', $companyId)
                    ->whereIn('client_id', $hvacClientIds)
                    ->delete();
            }
            if ($hvacClientIds !== []) {
                DB::table('company_clients')
                    ->where('company_id', $companyId)
                    ->whereIn('user_id', $hvacClientIds)
                    ->delete();
            }
            if ($hvacClientIds !== []) {
                User::withTrashed()->whereIn('id', $hvacClientIds)->forceDelete();
            }

            TeamMember::query()
                ->where('company_id', $companyId)
                ->where('email', 'like', 'demo.team.hvac.%@demo.rexten.internal')
                ->delete();

            Service::query()
                ->where('company_id', $companyId)
                ->where('slug', 'like', 'demo-rp-hvac-%')
                ->delete();

            DiscountTier::query()->where('company_id', $companyId)->where('name', 'like', 'Demo %')->delete();
            PromoCode::query()->where('company_id', $companyId)->where('code', 'like', 'DEMO%')->delete();

            Advertisement::query()
                ->where('company_id', $companyId)
                ->where('link', 'like', 'demo-rp-hvac-%')
                ->delete();
        });
    }

    private function seedCore(Company $company, string $ownerEmail): void
    {
        $company->update([
            'name' => $company->name ?: 'LA Comfort Air & Heat',
            'description' => 'Licensed HVAC for Greater LA — AC tune-ups, furnace safety checks, duct cleaning, and seasonal maintenance. EPA-certified technicians.',
            'address' => DemoRextenProDataset::SALON_ADDRESS,
            'city' => DemoRextenProDataset::SALON_CITY,
            'state' => DemoRextenProDataset::SALON_STATE,
            'zip_code' => DemoRextenProDataset::SALON_ZIP,
            'timezone' => DemoRextenProDataset::TIMEZONE,
            'latitude' => (string) DemoRextenProDataset::SALON_LAT,
            'longitude' => (string) DemoRextenProDataset::SALON_LNG,
            'phone' => '+1 (555) 010-0731',
            'email' => $ownerEmail,
            'website' => 'https://example.org/la-comfort-air-demo',
            'status' => 'active',
            'is_visible_on_marketplace' => true,
            'show_in_search' => true,
            'allow_booking' => true,
            'show_reviews' => true,
            'show_portfolio' => true,
            'seo_title' => 'LA Comfort Air & Heat — HVAC Service',
            'seo_description' => 'Book AC tune-ups, heating safety visits, and duct cleaning across Los Angeles.',
            'meta_keywords' => 'hvac los angeles, ac tune-up, furnace, duct cleaning, heating',
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
            'phone' => '+1 (555) 010-0922',
        ];

        $rows = [
            array_merge($base, [
                'name' => 'Chris Ortiz',
                'email' => DemoRextenProDataset::hvacTeamEmail('tech', 1),
                'role' => 'Lead HVAC technician',
                'home_address' => DemoRextenProDataset::CLEANER_DEPOT_1_ADDRESS,
                'home_latitude' => DemoRextenProDataset::CLEANER_DEPOT_1_LAT,
                'home_longitude' => DemoRextenProDataset::CLEANER_DEPOT_1_LNG,
                'sort_order' => 1,
            ]),
            array_merge($base, [
                'name' => 'Dana Brooks',
                'email' => DemoRextenProDataset::hvacTeamEmail('tech', 2),
                'role' => 'HVAC technician',
                'home_address' => DemoRextenProDataset::CLEANER_DEPOT_2_ADDRESS,
                'home_latitude' => DemoRextenProDataset::CLEANER_DEPOT_2_LAT,
                'home_longitude' => DemoRextenProDataset::CLEANER_DEPOT_2_LNG,
                'sort_order' => 2,
            ]),
        ];

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
            $email = DemoRextenProDataset::hvacClientEmail($i);
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
                    'phone' => DemoRextenProDataset::fakePhoneUs($i + 7000),
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

    /** @return array{ac_tune: Service, furnace: Service, duct: Service} */
    private function seedServices(Company $company): array
    {
        $cat = ServiceCategory::query()->where('slug', 'hvac')->firstOrFail();
        $suffix = $company->id;

        $acTune = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-hvac-ac-tune-'.$suffix],
            [
                'category_id' => $cat->id,
                'name' => 'AC tune-up & inspection (visit)',
                'description' => 'Refrigerant check, coil cleaning, electrical and airflow inspection.',
                'price' => 329,
                'duration_minutes' => 120,
                'service_type' => 'offsite',
                'is_active' => true,
                'sort_order' => 1,
            ]
        );
        $furnace = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-hvac-furnace-safety-'.$suffix],
            [
                'category_id' => $cat->id,
                'name' => 'Heating safety check (visit)',
                'description' => 'Heat exchanger visual, ignition, gas line and venting safety review.',
                'price' => 249,
                'duration_minutes' => 90,
                'service_type' => 'offsite',
                'is_active' => true,
                'sort_order' => 2,
            ]
        );
        $duct = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-hvac-duct-clean-'.$suffix],
            [
                'category_id' => $cat->id,
                'name' => 'Duct cleaning (visit)',
                'description' => 'Main trunk and branch cleaning, register vacuum, filter replacement optional.',
                'price' => 589,
                'duration_minutes' => 180,
                'service_type' => 'offsite',
                'is_active' => true,
                'sort_order' => 3,
            ]
        );

        return [
            'ac_tune' => $acTune,
            'furnace' => $furnace,
            'duct' => $duct,
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
                'min_order_amount' => 150,
                'max_discount_amount' => 55,
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
                'min_order_amount' => 220,
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
        $teamIds = $team->pluck('id')->values()->all();
        $schedule = [
            'monday' => ['enabled' => true, 'from' => '07:30', 'to' => '18:30', 'duration' => 60],
            'tuesday' => ['enabled' => true, 'from' => '07:30', 'to' => '18:30', 'duration' => 60],
            'wednesday' => ['enabled' => true, 'from' => '07:30', 'to' => '18:30', 'duration' => 60],
            'thursday' => ['enabled' => true, 'from' => '07:30', 'to' => '18:30', 'duration' => 60],
            'friday' => ['enabled' => true, 'from' => '07:30', 'to' => '18:30', 'duration' => 60],
            'saturday' => ['enabled' => true, 'from' => '08:00', 'to' => '15:00', 'duration' => 60],
            'sunday' => ['enabled' => false],
        ];

        Advertisement::query()->updateOrCreate(
            ['company_id' => $company->id, 'link' => 'demo-rp-hvac-marketplace-'.$company->id],
            [
                'type' => 'regular',
                'title' => 'LA Comfort Air & Heat — HVAC across LA',
                'description' => 'AC tune-ups, heating safety checks, and duct cleaning — routed service vans.',
                'image' => 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'services',
                'city' => 'Los Angeles',
                'state' => 'CA',
                'start_date' => now()->subMonth(),
                'end_date' => now()->addYear(),
                'is_active' => true,
                'status' => 'approved',
                'priority' => 10,
                'services' => [
                    ['id' => $services['ac_tune']->id, 'name' => $services['ac_tune']->name, 'price' => (float) $services['ac_tune']->price, 'duration' => $services['ac_tune']->duration_minutes],
                    ['id' => $services['furnace']->id, 'name' => $services['furnace']->name, 'price' => (float) $services['furnace']->price, 'duration' => $services['furnace']->duration_minutes],
                    ['id' => $services['duct']->id, 'name' => $services['duct']->name, 'price' => (float) $services['duct']->price, 'duration' => $services['duct']->duration_minutes],
                ],
                'team' => $teamIds,
                'portfolio' => DemoRextenProDataset::advertisementPortfolioHvac(),
                'schedule' => $schedule,
                'slot_step_minutes' => 30,
                'price_from' => 249,
                'price_to' => 589,
                'currency' => 'USD',
                'category_slug' => 'hvac',
            ]
        );
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function hvacDateWindow(): array
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
     * @param  array{ac_tune: Service, furnace: Service, duct: Service}  $services
     * @param  \Illuminate\Support\Collection<int, TeamMember>  $techs
     * @return array{completed_ids: array<int, int>, route_dates: array<string, array<int, string>>}
     */
    private function seedBookings(
        Company $company,
        array $clients,
        array $services,
        $techs,
        string $marker
    ): array {
        $points = DemoRextenProDataset::laVisitPoints();
        $svcCycle = [$services['ac_tune'], $services['furnace'], $services['duct']];
        $completedIds = [];
        $routeDates = [];

        Booking::withoutEvents(function () use (
            $company,
            $clients,
            $techs,
            $marker,
            $points,
            $svcCycle,
            &$completedIds,
            &$routeDates
        ): void {
            [$windowStart, $juneEnd] = $this->hvacDateWindow();
            $dateList = [];
            for ($d = $windowStart->copy(); $d->lte($juneEnd); $d->addDay()) {
                $dateList[] = $d->format('Y-m-d');
            }
            if ($dateList === []) {
                return;
            }

            mt_srand((int) ($company->id * 900_017_017 + (int) $windowStart->format('Ymd')));

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

            $idx = 0;
            foreach ($dateList as $date) {
                $n = $counts[$date];
                if ($n <= 0) {
                    continue;
                }

                $daySlots = [];
                for ($k = 0; $k < $n; $k++) {
                    $daySlots[] = 7 * 60 + 30 + mt_rand(0, (10 * 60) + 30);
                }
                sort($daySlots);
                for ($k = 1; $k < $n; $k++) {
                    if ($daySlots[$k] <= $daySlots[$k - 1]) {
                        $daySlots[$k] = min(18 * 60 + 15, $daySlots[$k - 1] + mt_rand(20, 95));
                    }
                }

                foreach ($daySlots as $slotIdx => $startMin) {
                    $i = $idx;
                    $client = $clients[mt_rand(0, count($clients) - 1)];
                    $svc = $svcCycle[($i + $slotIdx + mt_rand(0, 2)) % count($svcCycle)];
                    $spec = $techs[mt_rand(0, $techs->count() - 1)];
                    $p = $points[mt_rand(0, count($points) - 1)];
                    $hour = intdiv((int) $startMin, 60);
                    $minute = (int) $startMin % 60;
                    $timeStr = sprintf('%02d:%02d:00', $hour, $minute);
                    $status = $this->demoBookingStatus($i, $date);
                    $price = (float) $svc->price;
                    $notes = 'HVAC service — '.$p['label'].'. '.$marker;

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
                        'notes' => 'Service address (demo POI)',
                    ]);

                    if ($status === 'completed') {
                        $completedIds[] = $booking->id;
                    }
                    $key = (string) $spec->id;
                    if (! isset($routeDates[$key])) {
                        $routeDates[$key] = [];
                    }
                    $routeDates[$key][$date] = $date;
                    $idx++;
                }
            }
        });

        return [
            'completed_ids' => $completedIds,
            'route_dates' => $routeDates,
        ];
    }

    private function seedClientNotes(int $companyId, array $clients): void
    {
        if (! Schema::hasTable('client_notes')) {
            return;
        }
        $samples = [
            'Two-story home — ladder access to attic unit.',
            'Pets in home; close doors to work areas.',
            'Prefers PM slots; gate code in profile.',
            'VIP — seasonal maintenance bundle interest.',
        ];
        foreach ([0, 6, 14, 22, 35] as $idx => $clientIndex) {
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
            'AC runs quieter after the tune-up — worth it.',
            'Technician explained the furnace check clearly.',
            'Duct cleaning made a noticeable difference.',
            'On time, professional, will use again.',
            'Good communication before the visit.',
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
                    'response' => $i % 3 === 0 ? 'Thanks for choosing LA Comfort Air & Heat!' : null,
                    'response_at' => $i % 3 === 0 ? now()->subDays(2) : null,
                ]
            );
        }
    }

    /**
     * @param  array<string, array<int, string>>  $routeDates
     * @param  \Illuminate\Support\Collection<int, TeamMember>  $techs
     */
    private function seedRoutes(int $companyId, $techs, array $routeDates): void
    {
        $orchestrator = app(RouteOrchestrator::class);
        foreach ($techs as $tech) {
            $dates = $routeDates[(string) $tech->id] ?? [];
            foreach ($dates as $date) {
                $count = Booking::query()
                    ->where('company_id', $companyId)
                    ->where('specialist_id', $tech->id)
                    ->whereDate('booking_date', $date)
                    ->where('execution_type', 'offsite')
                    ->where('status', '!=', 'cancelled')
                    ->count();
                if ($count < 2) {
                    continue;
                }
                try {
                    $orchestrator->optimizeAndSave((int) $tech->id, $date, $companyId, true);
                    $this->line("Маршрут: specialist {$tech->id} / {$date}");
                } catch (\Throwable $e) {
                    $this->warn("Маршрут {$tech->id} / {$date}: ".$e->getMessage());
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
