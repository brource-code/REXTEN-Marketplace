<?php

namespace App\Services\AI;

use App\Exceptions\AiQuotaExceededException;
use App\Models\Company;
use App\Services\SubscriptionLimitService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AiQuotaService
{
    public function assertCanUseAi(int $companyId): void
    {
        $u = $this->getUsage($companyId);
        if (! $u['allowed']) {
            return;
        }
        if ($u['requests_used'] >= $u['requests_limit']) {
            throw new AiQuotaExceededException($u, (string) ($u['period_end_iso'] ?? ''));
        }
        if ($u['tokens_limit'] > 0 && $u['tokens_used'] >= $u['tokens_limit']) {
            throw new AiQuotaExceededException($u, (string) ($u['period_end_iso'] ?? ''));
        }
    }

    public function recordAiUsage(int $companyId, int $promptTokens, int $completionTokens): void
    {
        $period = $this->periodRow($companyId)['period'];
        DB::transaction(function () use ($companyId, $period, $promptTokens, $completionTokens) {
            $row = DB::table('company_ai_usage')
                ->where('company_id', $companyId)
                ->where('period', $period)
                ->lockForUpdate()
                ->first();
            if ($row === null) {
                DB::table('company_ai_usage')->insert([
                    'company_id' => $companyId,
                    'period' => $period,
                    'requests_count' => 1,
                    'tokens_in' => $promptTokens,
                    'tokens_out' => $completionTokens,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('company_ai_usage')
                    ->where('id', $row->id)
                    ->update([
                        'requests_count' => (int) $row->requests_count + 1,
                        'tokens_in' => (int) $row->tokens_in + $promptTokens,
                        'tokens_out' => (int) $row->tokens_out + $completionTokens,
                        'updated_at' => now(),
                    ]);
            }
        });
    }

    /**
     * @return array{
     *   allowed: bool,
     *   requests_used: int,
     *   requests_limit: int,
     *   tokens_used: int,
     *   tokens_limit: int,
     *   period: string,
     *   period_end_iso: string|null
     * }
     */
    public function getUsage(int $companyId): array
    {
        $plan = SubscriptionLimitService::getPlanForCompany($companyId);
        $maxReq = $plan ? (int) $plan->getFeature('ai_max_requests_per_month', 0) : 0;
        $maxTok = $plan ? (int) $plan->getFeature('ai_max_tokens_per_month', 0) : 0;
        $allowed = $maxReq > 0;

        $row = $this->periodRow($companyId);
        $reqUsed = 0;
        $tokUsed = 0;
        if (Schema::hasTable('company_ai_usage')) {
            $usage = DB::table('company_ai_usage')
                ->where('company_id', $companyId)
                ->where('period', $row['period'])
                ->first();
            $reqUsed = (int) ($usage->requests_count ?? 0);
            $tokIn = (int) ($usage->tokens_in ?? 0);
            $tokOut = (int) ($usage->tokens_out ?? 0);
            $tokUsed = $tokIn + $tokOut;
        }

        return [
            'allowed' => $allowed,
            'requests_used' => $reqUsed,
            'requests_limit' => $maxReq,
            'tokens_used' => $tokUsed,
            'tokens_limit' => $maxTok,
            'period' => $row['period'],
            'period_end_iso' => $row['periodEnd']->toIso8601String(),
        ];
    }

    /**
     * @return array{period: string, periodEnd: Carbon, tz: string}
     */
    public function periodRow(int $companyId): array
    {
        $company = Company::query()->find($companyId);
        $tz = $company !== null ? $company->resolveTimezone() : 'America/Los_Angeles';
        $now = now()->timezone($tz);
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $period = $startOfMonth->format('Y-m');

        return [
            'period' => $period,
            'periodEnd' => $endOfMonth,
            'tz' => $tz,
        ];
    }
}
