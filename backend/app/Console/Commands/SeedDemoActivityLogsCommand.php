<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Company;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Демо-логи: клиенты не числятся авторами действий в бизнес-админке.
 * Бизнес-сегмент → только владелец компании или сотрудник (company_users).
 * Клиент-сегмент → клиенты с бронями / CLIENT.
 * docker exec rexten_backend php artisan activity:seed-demo
 */
class SeedDemoActivityLogsCommand extends Command
{
    protected $signature = 'activity:seed-demo {--count=20 : Количество записей}';

    protected $description = 'Тестовые логи активности (роли согласованы с сегментом)';

    public function handle(): int
    {
        $count = max(1, (int) $this->option('count'));
        $companyIds = Company::query()->orderBy('id')->pluck('id')->all();
        if ($companyIds === []) {
            $this->error('Нет компаний в БД.');

            return 1;
        }

        $superadmin = User::query()->where('role', 'SUPERADMIN')->orderBy('id')->first();
        if (!$superadmin) {
            $this->error('Нет пользователя SUPERADMIN.');

            return 1;
        }

        $templates = [
            ['action' => 'login', 'segment' => ActivityLog::SEGMENT_CLIENT, 'category' => ActivityLog::CATEGORY_AUTH, 'entity_type' => 'User', 'description' => 'Вход клиента в ЛК'],
            ['action' => 'create', 'segment' => ActivityLog::SEGMENT_CLIENT, 'category' => ActivityLog::CATEGORY_BOOKING, 'entity_type' => 'Booking', 'entity_name' => 'Новая бронь', 'description' => 'Клиент создал бронирование'],
            ['action' => 'cancel', 'segment' => ActivityLog::SEGMENT_CLIENT, 'category' => ActivityLog::CATEGORY_BOOKING, 'entity_type' => 'Booking', 'description' => 'Клиент отменил бронь'],
            ['action' => 'update', 'segment' => ActivityLog::SEGMENT_CLIENT, 'category' => ActivityLog::CATEGORY_USER, 'entity_type' => 'User', 'description' => 'Клиент обновил профиль'],
            ['action' => 'logout', 'segment' => ActivityLog::SEGMENT_BUSINESS, 'category' => ActivityLog::CATEGORY_AUTH, 'entity_type' => 'User', 'description' => 'Выход из панели бизнеса'],
            ['action' => 'create', 'segment' => ActivityLog::SEGMENT_BUSINESS, 'category' => ActivityLog::CATEGORY_BOOKING, 'entity_type' => 'Booking', 'description' => 'Менеджер создал бронь от имени салона'],
            ['action' => 'create', 'segment' => ActivityLog::SEGMENT_BUSINESS, 'category' => ActivityLog::CATEGORY_SERVICE, 'entity_type' => 'Service', 'description' => 'Добавлена услуга в каталог'],
            ['action' => 'update', 'segment' => ActivityLog::SEGMENT_BUSINESS, 'category' => ActivityLog::CATEGORY_SETTINGS, 'entity_type' => 'Settings', 'description' => 'Изменено расписание работы'],
            ['action' => 'complete', 'segment' => ActivityLog::SEGMENT_BUSINESS, 'category' => ActivityLog::CATEGORY_BOOKING, 'entity_type' => 'Booking', 'description' => 'Услуга отмечена выполненной'],
            ['action' => 'update', 'segment' => ActivityLog::SEGMENT_BUSINESS, 'category' => ActivityLog::CATEGORY_COMPANY, 'entity_type' => 'Company', 'description' => 'Обновлён профиль компании'],
            ['action' => 'update', 'segment' => ActivityLog::SEGMENT_ADMIN, 'category' => ActivityLog::CATEGORY_COMPANY, 'entity_type' => 'Company', 'description' => 'Суперадмин изменил данные компании'],
            ['action' => 'approve', 'segment' => ActivityLog::SEGMENT_ADMIN, 'category' => ActivityLog::CATEGORY_ADVERTISEMENT, 'entity_type' => 'Advertisement', 'description' => 'Объявление одобрено'],
            ['action' => 'reject', 'segment' => ActivityLog::SEGMENT_ADMIN, 'category' => ActivityLog::CATEGORY_ADVERTISEMENT, 'entity_type' => 'Advertisement', 'description' => 'Объявление отклонено'],
            ['action' => 'block', 'segment' => ActivityLog::SEGMENT_ADMIN, 'category' => ActivityLog::CATEGORY_USER, 'entity_type' => 'User', 'description' => 'Пользователь заблокирован'],
            ['action' => 'approve', 'segment' => ActivityLog::SEGMENT_ADMIN, 'category' => ActivityLog::CATEGORY_COMPANY, 'entity_type' => 'Company', 'description' => 'Компания прошла модерацию'],
            ['action' => 'delete', 'segment' => ActivityLog::SEGMENT_ADMIN, 'category' => ActivityLog::CATEGORY_REVIEW, 'entity_type' => 'Review', 'description' => 'Отзыв удалён'],
            ['action' => 'update', 'segment' => ActivityLog::SEGMENT_ADMIN, 'category' => ActivityLog::CATEGORY_SETTINGS, 'entity_type' => 'Settings', 'description' => 'Глобальные настройки платформы'],
            ['action' => 'login', 'segment' => ActivityLog::SEGMENT_ADMIN, 'category' => ActivityLog::CATEGORY_AUTH, 'entity_type' => 'User', 'description' => 'Вход суперадмина'],
            ['action' => 'create', 'segment' => ActivityLog::SEGMENT_SYSTEM, 'category' => ActivityLog::CATEGORY_AUTH, 'entity_type' => 'User', 'description' => 'Регистрация пользователя'],
            ['action' => 'create', 'segment' => ActivityLog::SEGMENT_CLIENT, 'category' => ActivityLog::CATEGORY_BOOKING, 'entity_type' => 'Booking', 'description' => 'Повторная запись клиента'],
        ];

        $base = now()->subDays(5);
        $created = 0;
        $seenClientCompany = [];

        for ($i = 0; $i < $count; $i++) {
            $tpl = $templates[$i % count($templates)];
            $companyId = (int) $companyIds[$i % count($companyIds)];

            if (in_array($tpl['segment'], [ActivityLog::SEGMENT_ADMIN, ActivityLog::SEGMENT_SYSTEM], true)) {
                $user = $superadmin;
                $logCompanyId = null;
            } elseif ($tpl['segment'] === ActivityLog::SEGMENT_BUSINESS) {
                $user = $this->businessActorForCompany($companyId);
                if (!$user) {
                    $user = $this->businessActorForCompany((int) $companyIds[($i + 1) % count($companyIds)]);
                    $companyId = (int) $companyIds[($i + 1) % count($companyIds)];
                }
                if (!$user) {
                    $this->warn("Пропуск шага {$i}: нет владельца/сотрудника для компании {$companyId}");

                    continue;
                }
                $logCompanyId = $companyId;
            } else {
                $user = $this->clientActorForCompany($companyId, $seenClientCompany);
                if (!$user) {
                    $user = $this->createDemoClientForCompany($companyId);
                }
                $logCompanyId = $companyId;
            }

            ActivityLog::create([
                'user_id' => $user->id,
                'company_id' => $logCompanyId,
                'action' => $tpl['action'],
                'segment' => $tpl['segment'],
                'category' => $tpl['category'],
                'entity_type' => $tpl['entity_type'],
                'entity_id' => $tpl['entity_id'] ?? null,
                'entity_name' => $tpl['entity_name'] ?? null,
                'description' => '[demo] ' . $tpl['description'] . ' — ' . $user->email
                    . ($logCompanyId ? ' (компания #' . $logCompanyId . ')' : ''),
                'old_values' => $tpl['action'] === 'update' ? ['field' => 'old'] : null,
                'new_values' => $tpl['action'] === 'update' ? ['field' => 'new'] : null,
                'metadata' => ['demo' => true, 'index' => $i + 1],
                'ip_address' => '10.0.' . ($i % 250) . '.' . (($i * 11) % 250),
                'user_agent' => 'DemoAgent/1.0 (Rexten test)',
                'created_at' => $base->copy()->addHours($i * 3)->addMinutes($i * 7),
                'updated_at' => $base->copy()->addHours($i * 3)->addMinutes($i * 7),
            ]);
            $created++;
        }

        $this->info("Создано демо-записей: {$created}. Бизнес-действия — только от владельцев/сотрудников, не от клиентов.");

        return 0;
    }

    /**
     * Владелец компании или пользователь из company_users (доступ в админку бизнеса).
     */
    private function businessActorForCompany(int $companyId): ?User
    {
        $ownerId = Company::where('id', $companyId)->value('owner_id');
        if ($ownerId) {
            $u = User::find($ownerId);
            if ($u && $u->role === 'BUSINESS_OWNER') {
                return $u;
            }
        }

        $staffIds = DB::table('company_users')
            ->where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('user_id')
            ->pluck('user_id');

        foreach ($staffIds as $uid) {
            $u = User::find($uid);
            if ($u && in_array($u->role, ['BUSINESS_OWNER', 'SUPERADMIN'], true)) {
                return $u;
            }
        }

        foreach ($staffIds as $uid) {
            $u = User::find($uid);
            if ($u && $u->role !== 'CLIENT') {
                return $u;
            }
        }

        if ($ownerId) {
            return User::find($ownerId);
        }

        return null;
    }

    /**
     * Клиент с бронью в этой компании (роль CLIENT), без доступа в бизнес-админку.
     *
     * @param  array<int, true>  $seenClientCompany
     */
    private function clientActorForCompany(int $companyId, array &$seenClientCompany): ?User
    {
        $q = Booking::query()
            ->where('company_id', $companyId)
            ->whereNotNull('user_id')
            ->orderBy('id');

        foreach ($q->cursor() as $booking) {
            $u = User::find($booking->user_id);
            if ($u && $u->role === 'CLIENT') {
                $key = $booking->user_id . '-' . $companyId;
                if (isset($seenClientCompany[$key])) {
                    continue;
                }
                $seenClientCompany[$key] = true;

                return $u;
            }
        }

        return null;
    }

    private function createDemoClientForCompany(int $companyId): User
    {
        return User::create([
            'email' => 'demo_client_' . Str::lower(Str::random(8)) . '@rexten.demo',
            'password' => bcrypt(Str::random(20)),
            'role' => 'CLIENT',
            'is_active' => true,
        ]);
    }
}
