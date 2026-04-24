<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\DemoPresentationSubscriptionService;
use Illuminate\Console\Command;

/**
 * Разовая правка для уже развёрнутого демо: без полного --force re-seed.
 */
class DemoFixPresentationSubscriptionCommand extends Command
{
    protected $signature = 'demo:fix-presentation-subscription
        {--owner-email=demo@rexten.pro : Email владельца BUSINESS_OWNER}';

    protected $description = 'Для демо-компании: внутренняя подписка Starter (без Stripe) + реактивация специалистов с email *@demo.rexten.internal — чтобы в бронях было несколько исполнителей (Free даёт только одного активного).';

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
            $this->error('У пользователя нет компании (ownedCompanies).');

            return self::FAILURE;
        }

        DemoPresentationSubscriptionService::ensureStarterForDemoCompany((int) $company->id);
        $this->info("Готово: компания #{$company->id} ({$company->name}) — Starter, реактивация *@demo.rexten.internal.");

        return self::SUCCESS;
    }
}
