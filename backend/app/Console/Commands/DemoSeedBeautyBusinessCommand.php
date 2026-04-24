<?php

namespace App\Console\Commands;

use App\Models\Advertisement;
use App\Models\Booking;
use App\Models\BookingLocation;
use App\Models\Company;
use App\Models\DiscountTier;
use App\Models\PromoCode;
use App\Models\Review;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\DemoPresentationSubscriptionService;
use Carbon\Carbon;
use Database\Seeders\DemoRextenPro\DemoRextenProDataset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DemoSeedBeautyBusinessCommand extends Command
{
    protected $signature = 'demo:seed-beauty-business
        {--owner-email=demo-beauty@rexten.pro : Email владельца компании (BUSINESS_OWNER)}
        {--force : Удалить предыдущие demo-seed данные этой компании и создать заново}
        {--create-owner : Создать владельца BUSINESS_OWNER, если пользователя с таким email нет (пароль для демо — см. вывод команды)}';

    protected $description = 'Наполняет отдельный демо-аккаунт бьюти: салон (onsite), маникюр, брови, парикмахер, брони апр–июнь, скидки, объявления, отзывы.';

    private const CLIENT_COUNT = 52;

    private const BOOKING_TOTAL = 92;

    private const IDEMPOTENT_MIN_BOOKINGS = 45;

    /** Пароль при --create-owner (как в тестовых данных README). */
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
                'name' => 'Century City Beauty Lab',
                'slug' => 'century-city-beauty-lab-'.$owner->id,
                'description' => 'Beauty salon demo — nails, brows, hair.',
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
            DemoPresentationSubscriptionService::ensureStarterForDemoCompany((int) $company->id);
            $this->info("Уже есть {$existingDemoBookings} demo-броней. Пропуск полного сида (используйте --force). Подписка демо для нескольких исполнителей приведена в порядок.");

            return self::SUCCESS;
        }

        if ($this->option('force')) {
            $this->warn('Удаление предыдущих demo-beauty-seed данных…');
            $this->rollbackBeautyDemoData($company->id);
        }

        $this->seedCore($company, $email);
        $this->seedTeam($company);
        DemoPresentationSubscriptionService::ensureStarterForDemoCompany((int) $company->id);
        $clients = $this->seedClients($company);
        $services = $this->seedServices($company);
        $team = TeamMember::query()->where('company_id', $company->id)->orderBy('sort_order')->orderBy('id')->get();
        $stylists = $team->filter(fn (TeamMember $m) => str_contains((string) $m->email, 'demo.team.beauty.'))->values();
        if ($stylists->count() < 3) {
            $this->error('Ожидались 3 мастера бьюти (email demo.team.beauty.*).');

            return self::FAILURE;
        }

        $this->seedDiscounts($company);
        $this->seedAdvertisements($company, $services, $team);
        $bookingMeta = $this->seedBookings($company, $clients, $services, $stylists, $marker);
        $this->seedClientNotes($company->id, $clients);
        $this->seedReviews($company, $bookingMeta['completed_ids']);

        $this->info('Готово. Бизнес-админка бьюти: '.$email);

        return self::SUCCESS;
    }

    private function rollbackBeautyDemoData(int $companyId): void
    {
        $marker = DemoRextenProDataset::DEMO_BOOKING_MARKER;
        $demoBookingIds = Booking::query()
            ->where('company_id', $companyId)
            ->where('notes', 'like', '%'.$marker.'%')
            ->pluck('id')
            ->all();

        $beautyClientIds = User::query()
            ->where('email', 'like', 'rexten_demo_b_%@clients.rexten.demo')
            ->pluck('id')
            ->all();

        DB::transaction(function () use ($companyId, $demoBookingIds, $beautyClientIds, $marker): void {
            if ($demoBookingIds !== []) {
                Review::query()->whereIn('booking_id', $demoBookingIds)->delete();
                if (Schema::hasTable('promo_code_usages')) {
                    DB::table('promo_code_usages')->whereIn('booking_id', $demoBookingIds)->delete();
                }
                Booking::query()->whereIn('id', $demoBookingIds)->delete();
            }

            if ($beautyClientIds !== [] && Schema::hasTable('client_notes')) {
                DB::table('client_notes')
                    ->where('company_id', $companyId)
                    ->whereIn('client_id', $beautyClientIds)
                    ->delete();
            }
            if ($beautyClientIds !== []) {
                DB::table('company_clients')
                    ->where('company_id', $companyId)
                    ->whereIn('user_id', $beautyClientIds)
                    ->delete();
            }
            if ($beautyClientIds !== []) {
                User::withTrashed()->whereIn('id', $beautyClientIds)->forceDelete();
            }

            TeamMember::query()
                ->where('company_id', $companyId)
                ->where('email', 'like', 'demo.team.beauty.%@demo.rexten.internal')
                ->delete();

            Service::query()
                ->where('company_id', $companyId)
                ->where('slug', 'like', 'demo-rp-bty-%')
                ->delete();

            DiscountTier::query()->where('company_id', $companyId)->where('name', 'like', 'Demo %')->delete();
            PromoCode::query()->where('company_id', $companyId)->where('code', 'like', 'DEMO%')->delete();

            Advertisement::query()
                ->where('company_id', $companyId)
                ->where('link', 'like', 'demo-rp-bty-%')
                ->delete();
        });
    }

    private function seedCore(Company $company, string $ownerEmail): void
    {
        $company->update([
            'name' => $company->name ?: 'Century City Beauty Lab',
            'description' => 'Full-service beauty studio in Century City — gel nails, brow design, cuts & styling. [demo]',
            'address' => DemoRextenProDataset::SALON_ADDRESS,
            'city' => DemoRextenProDataset::SALON_CITY,
            'state' => DemoRextenProDataset::SALON_STATE,
            'zip_code' => DemoRextenProDataset::SALON_ZIP,
            'timezone' => DemoRextenProDataset::TIMEZONE,
            'latitude' => (string) DemoRextenProDataset::SALON_LAT,
            'longitude' => (string) DemoRextenProDataset::SALON_LNG,
            'phone' => '+1 (555) 010-0288',
            'email' => $ownerEmail,
            'website' => 'https://example.org/century-city-beauty-demo',
            'status' => 'active',
            'is_visible_on_marketplace' => true,
            'show_in_search' => true,
            'allow_booking' => true,
            'show_reviews' => true,
            'show_portfolio' => true,
            'seo_title' => 'Century City Beauty Lab — Nails, Brows & Hair',
            'seo_description' => 'Book gel manicure, brow shaping, and hair services at our Los Angeles studio.',
            'meta_keywords' => 'los angeles beauty, manicure, brows, haircut, century city salon',
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
            'phone' => '+1 (555) 010-0911',
        ];

        $rows = [
            array_merge($base, [
                'name' => 'Avery Chen',
                'email' => DemoRextenProDataset::beautyTeamEmail('nails', 1),
                'role' => 'Nail artist — gel & design',
                'home_address' => DemoRextenProDataset::SALON_ADDRESS,
                'home_latitude' => DemoRextenProDataset::SALON_LAT,
                'home_longitude' => DemoRextenProDataset::SALON_LNG,
                'sort_order' => 1,
            ]),
            array_merge($base, [
                'name' => 'Morgan Patel',
                'email' => DemoRextenProDataset::beautyTeamEmail('brows', 1),
                'role' => 'Brow specialist — lamination & shaping',
                'home_address' => DemoRextenProDataset::SALON_ADDRESS,
                'home_latitude' => DemoRextenProDataset::SALON_LAT,
                'home_longitude' => DemoRextenProDataset::SALON_LNG,
                'sort_order' => 2,
            ]),
            array_merge($base, [
                'name' => 'Riley Santos',
                'email' => DemoRextenProDataset::beautyTeamEmail('hair', 1),
                'role' => 'Hairstylist — cut, color & blowout',
                'home_address' => DemoRextenProDataset::SALON_ADDRESS,
                'home_latitude' => DemoRextenProDataset::SALON_LAT,
                'home_longitude' => DemoRextenProDataset::SALON_LNG,
                'sort_order' => 3,
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
            $email = DemoRextenProDataset::beautyClientEmail($i);
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
                    'phone' => DemoRextenProDataset::fakePhoneUs($i + 3000),
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

    /** @return array{manicure: Service, brows: Service, hair: Service} */
    private function seedServices(Company $company): array
    {
        $catBeauty = ServiceCategory::query()->where('slug', 'beauty')->firstOrFail();
        $suffix = $company->id;

        $manicure = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-bty-gel-mani-'.$suffix],
            [
                'category_id' => $catBeauty->id,
                'name' => 'Gel manicure (salon)',
                'description' => 'Gel polish application, shaping, and cuticle care at our Century City studio.',
                'price' => 95,
                'duration_minutes' => 60,
                'service_type' => 'onsite',
                'is_active' => true,
                'sort_order' => 1,
            ]
        );
        $brows = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-bty-brows-'.$suffix],
            [
                'category_id' => $catBeauty->id,
                'name' => 'Brow design & cleanup (salon)',
                'description' => 'Mapping, wax or tweeze, and finish — tailored arch.',
                'price' => 78,
                'duration_minutes' => 45,
                'service_type' => 'onsite',
                'is_active' => true,
                'sort_order' => 2,
            ]
        );
        $hair = Service::query()->updateOrCreate(
            ['company_id' => $company->id, 'slug' => 'demo-rp-bty-haircut-blowout-'.$suffix],
            [
                'category_id' => $catBeauty->id,
                'name' => 'Haircut & blowout (salon)',
                'description' => 'Precision cut and professional blowdry — styling included.',
                'price' => 135,
                'duration_minutes' => 75,
                'service_type' => 'onsite',
                'is_active' => true,
                'sort_order' => 3,
            ]
        );

        return [
            'manicure' => $manicure,
            'brows' => $brows,
            'hair' => $hair,
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
                'min_order_amount' => 70,
                'max_discount_amount' => 35,
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
                'min_order_amount' => 95,
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
            'monday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
            'tuesday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
            'wednesday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
            'thursday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
            'friday' => ['enabled' => true, 'from' => '09:00', 'to' => '20:00', 'duration' => 60],
            'saturday' => ['enabled' => true, 'from' => '09:00', 'to' => '18:00', 'duration' => 60],
            'sunday' => ['enabled' => true, 'from' => '10:00', 'to' => '17:00', 'duration' => 60],
        ];

        Advertisement::query()->updateOrCreate(
            ['company_id' => $company->id, 'link' => 'demo-rp-bty-marketplace-'.$company->id],
            [
                'type' => 'regular',
                'title' => 'Century City Beauty Lab — nails, brows & hair',
                'description' => 'Book gel manicure, brow design, or a cut & blowout at our LA studio.',
                'image' => 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'services',
                'city' => 'Los Angeles',
                'state' => 'CA',
                'start_date' => now()->subMonth(),
                'end_date' => now()->addYear(),
                'is_active' => true,
                'status' => 'approved',
                'priority' => 10,
                'services' => [
                    ['id' => $services['manicure']->id, 'name' => $services['manicure']->name, 'price' => (float) $services['manicure']->price, 'duration' => $services['manicure']->duration_minutes],
                    ['id' => $services['brows']->id, 'name' => $services['brows']->name, 'price' => (float) $services['brows']->price, 'duration' => $services['brows']->duration_minutes],
                    ['id' => $services['hair']->id, 'name' => $services['hair']->name, 'price' => (float) $services['hair']->price, 'duration' => $services['hair']->duration_minutes],
                ],
                'team' => $teamIds,
                'portfolio' => DemoRextenProDataset::advertisementPortfolioBeauty(),
                'schedule' => $schedule,
                'slot_step_minutes' => 15,
                'price_from' => 78,
                'price_to' => 135,
                'currency' => 'USD',
                'category_slug' => 'beauty',
            ]
        );

        Advertisement::query()->updateOrCreate(
            ['company_id' => $company->id, 'link' => 'demo-rp-bty-homepage-'.$company->id],
            [
                'type' => 'regular',
                'title' => 'Weekend slots — brows & nails',
                'description' => 'Popular combo: brow cleanup + gel manicure same day.',
                'image' => 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'homepage',
                'city' => 'Los Angeles',
                'state' => 'CA',
                'start_date' => now()->subWeek(),
                'end_date' => now()->addYear(),
                'is_active' => true,
                'status' => 'approved',
                'priority' => 6,
                'services' => [
                    ['id' => $services['manicure']->id, 'name' => $services['manicure']->name, 'price' => (float) $services['manicure']->price, 'duration' => $services['manicure']->duration_minutes],
                    ['id' => $services['brows']->id, 'name' => $services['brows']->name, 'price' => (float) $services['brows']->price, 'duration' => $services['brows']->duration_minutes],
                ],
                'team' => array_slice($teamIds, 0, 2),
                'portfolio' => DemoRextenProDataset::advertisementPortfolioBeauty(),
                'schedule' => $schedule,
                'slot_step_minutes' => 15,
                'price_from' => 78,
                'price_to' => 95,
                'currency' => 'USD',
                'category_slug' => 'beauty',
            ]
        );
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function beautyBookingDateWindow(): array
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
     * @param  array{manicure: Service, brows: Service, hair: Service}  $services
     * @param  \Illuminate\Support\Collection<int, TeamMember>  $stylists  nails, brows, hair
     * @return array{completed_ids: array<int, int>}
     */
    private function seedBookings(
        Company $company,
        array $clients,
        array $services,
        $stylists,
        string $marker
    ): array {
        $completedIds = [];
        $nails = $stylists[0];
        $browsSpec = $stylists[1];
        $hair = $stylists[2];

        Booking::withoutEvents(function () use (
            $company,
            $clients,
            $services,
            $nails,
            $browsSpec,
            $hair,
            $marker,
            &$completedIds
        ): void {
            [$windowStart, $juneEnd] = $this->beautyBookingDateWindow();
            $dateList = [];
            for ($d = $windowStart->copy(); $d->lte($juneEnd); $d->addDay()) {
                $dateList[] = $d->format('Y-m-d');
            }
            if ($dateList === []) {
                return;
            }

            mt_srand((int) ($company->id * 2_003_119_981 + (int) $windowStart->format('Ymd') + 77));

            $tz = DemoRextenProDataset::TIMEZONE;
            // Салон: чуть больше нагрузки в выходные
            $weights = [];
            foreach ($dateList as $dateStr) {
                $weights[] = Carbon::parse($dateStr, $tz)->isWeekend() ? 118 : 100;
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

            $salon = [
                'address' => DemoRextenProDataset::SALON_ADDRESS,
                'city' => DemoRextenProDataset::SALON_CITY,
                'state' => DemoRextenProDataset::SALON_STATE,
                'zip' => DemoRextenProDataset::SALON_ZIP,
                'lat' => DemoRextenProDataset::SALON_LAT,
                'lng' => DemoRextenProDataset::SALON_LNG,
            ];

            $cleanIdx = 0;
            foreach ($dateList as $date) {
                $n = $counts[$date];
                if ($n <= 0) {
                    continue;
                }

                $daySlots = [];
                for ($k = 0; $k < $n; $k++) {
                    $daySlots[] = 9 * 60 + mt_rand(0, (8 * 60) + 45);
                }
                sort($daySlots);
                for ($k = 1; $k < $n; $k++) {
                    if ($daySlots[$k] <= $daySlots[$k - 1]) {
                        $daySlots[$k] = min(19 * 60 + 30, $daySlots[$k - 1] + mt_rand(15, 55));
                    }
                }

                foreach ($daySlots as $slotIdx => $startMin) {
                    $i = $cleanIdx;
                    $client = $clients[mt_rand(0, count($clients) - 1)];
                    $svcRoll = ($i + $slotIdx + mt_rand(0, 2)) % 3;
                    if ($svcRoll === 0) {
                        $svc = $services['manicure'];
                        $spec = $nails;
                    } elseif ($svcRoll === 1) {
                        $svc = $services['brows'];
                        $spec = $browsSpec;
                    } else {
                        $svc = $services['hair'];
                        $spec = $hair;
                    }

                    $hour = intdiv((int) $startMin, 60);
                    $minute = (int) $startMin % 60;
                    $timeStr = sprintf('%02d:%02d:00', $hour, $minute);
                    $status = $this->demoBookingStatus($i, $date);
                    $price = (float) $svc->price;
                    $notes = 'In-salon service (Century City). '.$marker;

                    $booking = Booking::query()->create([
                        'company_id' => $company->id,
                        'user_id' => $client->id,
                        'service_id' => $svc->id,
                        'execution_type' => 'onsite',
                        'specialist_id' => $spec->id,
                        'booking_date' => $date.' 00:00:00',
                        'booking_time' => $timeStr,
                        'duration_minutes' => $svc->duration_minutes,
                        'price' => $price,
                        'total_price' => $price,
                        'status' => $status,
                        'notes' => $notes,
                        'cached_lat' => $salon['lat'],
                        'cached_lng' => $salon['lng'],
                        'geocoded_at' => now(),
                    ]);

                    BookingLocation::query()->create([
                        'booking_id' => $booking->id,
                        'type' => 'client',
                        'address_line1' => $salon['address'],
                        'city' => $salon['city'],
                        'state' => $salon['state'],
                        'zip' => $salon['zip'],
                        'lat' => $salon['lat'],
                        'lng' => $salon['lng'],
                        'notes' => 'Studio visit (demo)',
                    ]);

                    if ($status === 'completed') {
                        $completedIds[] = $booking->id;
                    }
                    $cleanIdx++;
                }
            }
        });

        return ['completed_ids' => $completedIds];
    }

    private function seedClientNotes(int $companyId, array $clients): void
    {
        if (! Schema::hasTable('client_notes')) {
            return;
        }
        $samples = [
            'Prefers late afternoon appointments.',
            'Sensitive skin — patch test for brow tint.',
            'Books gel + brows same day when possible.',
            'VIP — mention loyalty tier at checkout.',
        ];
        foreach ([0, 4, 11, 19, 28] as $idx => $clientIndex) {
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
            'Gel manicure held up perfectly — neat studio.',
            'Brows look natural, great mapping.',
            'Cut and blowout exactly what I asked for.',
            'Friendly team, easy to book.',
            'Will come back before events — solid experience.',
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
                    'response' => $i % 3 === 0 ? 'Thank you for visiting Century City Beauty Lab!' : null,
                    'response_at' => $i % 3 === 0 ? now()->subDays(2) : null,
                ]
            );
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
