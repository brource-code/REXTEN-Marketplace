<?php

namespace App\Services;

use App\Models\Advertisement;
use App\Models\Company;
use App\Models\CompanyUser;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\TeamMember;
use Illuminate\Database\Eloquent\Builder;

class SubscriptionLimitService
{
    private const RESOURCE_TO_FEATURE = [
        'team_members' => 'max_team_members',
        'services' => 'max_services',
        'advertisements' => 'max_advertisements',
    ];

    public static function getPlanForCompany(int $companyId): ?SubscriptionPlan
    {
        $company = Company::find($companyId);
        if (!$company) {
            return SubscriptionPlan::getDefault();
        }

        $subscription = self::getActiveSubscription($companyId);

        if ($subscription) {
            $plan = SubscriptionPlan::findBySlug($subscription->plan);
            if ($plan) {
                return $plan;
            }
        }

        return SubscriptionPlan::getDefault();
    }

    public static function getActiveSubscription(int $companyId): ?Subscription
    {
        return Subscription::where('company_id', $companyId)
            ->where('status', Subscription::STATUS_ACTIVE)
            ->latest()
            ->first();
    }

    public static function isInGracePeriod(int $companyId): bool
    {
        $sub = self::getActiveSubscription($companyId);
        if (!$sub || !$sub->grace_period_ends_at) {
            return false;
        }

        return $sub->grace_period_ends_at->isFuture();
    }

    public static function isOverLimit(int $companyId): bool
    {
        $details = self::getOverLimitDetails($companyId);

        return $details['is_over_limit'] ?? false;
    }

    /**
     * @return array{
     *   is_over_limit: bool,
     *   grace_period_ends_at: string|null,
     *   grace_period_active: bool,
     *   resources: array<string, array<string, mixed>>
     * }
     */
    public static function getOverLimitDetails(int $companyId): array
    {
        $plan = self::getPlanForCompany($companyId);
        $sub = self::getActiveSubscription($companyId);

        $graceEnds = $sub?->grace_period_ends_at;
        $graceActive = $graceEnds && $graceEnds->isFuture();

        if (!$plan) {
            return [
                'is_over_limit' => false,
                'grace_period_ends_at' => $graceEnds?->toIso8601String(),
                'grace_period_active' => $graceActive,
                'resources' => [],
            ];
        }

        $resources = [];
        $anyOver = false;

        foreach (self::RESOURCE_TO_FEATURE as $resource => $featureKey) {
            $limit = (int) $plan->getFeature($featureKey, 0);
            if ($limit < 0) {
                $resources[$resource] = [
                    'current_active' => 0,
                    'total_all' => 0,
                    'limit' => 0,
                    'unlimited' => true,
                    'over_by' => 0,
                    'items' => [],
                ];
                continue;
            }

            $active = self::countResourceActive($companyId, $resource);
            $totalAll = self::countResourceTotal($companyId, $resource);
            $overBy = max(0, $active - $limit);
            if ($overBy > 0) {
                $anyOver = true;
            }

            $resources[$resource] = [
                'current_active' => $active,
                'total_all' => $totalAll,
                'limit' => $limit,
                'unlimited' => false,
                'over_by' => $overBy,
                'items' => $overBy > 0 ? self::listOverLimitItems($companyId, $resource) : [],
            ];
        }

        return [
            'is_over_limit' => $anyOver,
            'grace_period_ends_at' => $graceEnds?->toIso8601String(),
            'grace_period_active' => $graceActive,
            'resources' => $resources,
        ];
    }

    public static function getUsage(int $companyId): array
    {
        $plan = self::getPlanForCompany($companyId);
        if (!$plan) {
            return self::emptyUsage();
        }

        $sub = self::getActiveSubscription($companyId);
        $graceEnds = $sub?->grace_period_ends_at;
        $graceActive = $graceEnds && $graceEnds->isFuture();

        $maxTeam = (int) $plan->getFeature('max_team_members', 0);
        $maxServices = (int) $plan->getFeature('max_services', 0);
        $maxAds = (int) $plan->getFeature('max_advertisements', 0);

        $teamActive = self::countTeamMembersActive($companyId);
        $teamTotal = self::countTeamMembersTotalAll($companyId);
        $serviceActive = self::countServicesActive($companyId);
        $serviceTotal = self::countServicesTotal($companyId);
        $adActive = self::countMarketplaceAdvertisementsActive($companyId);
        $adTotal = self::countMarketplaceAdvertisementsTotal($companyId);

        return [
            'team_members' => self::buildNumericUsageExtended($teamActive, $teamTotal, $maxTeam),
            'services' => self::buildNumericUsageExtended($serviceActive, $serviceTotal, $maxServices),
            'advertisements' => self::buildNumericUsageExtended($adActive, $adTotal, $maxAds),
            'analytics' => ['allowed' => $plan->hasFeature('analytics')],
            'api_access' => ['allowed' => $plan->hasFeature('api_access')],
            'priority_support' => ['allowed' => $plan->hasFeature('priority_support')],
            'routes' => ['allowed' => $plan->hasFeature('routes')],
            'grace_period_ends_at' => $graceEnds?->toIso8601String(),
            'grace_period_active' => $graceActive,
            'is_over_limit' => self::isOverLimit($companyId),
            'scheduled_plan' => $sub?->scheduled_plan,
            'current_period_end' => $sub?->current_period_end?->toIso8601String(),
            'plan' => $sub?->plan,
        ];
    }

    public static function canCreate(int $companyId, string $resource): bool
    {
        if (!isset(self::RESOURCE_TO_FEATURE[$resource])) {
            return true;
        }

        $plan = self::getPlanForCompany($companyId);
        if (!$plan) {
            return false;
        }

        $featureKey = self::RESOURCE_TO_FEATURE[$resource];
        $limit = (int) $plan->getFeature($featureKey, 0);

        if ($limit < 0) {
            return true;
        }

        // Over limit on active usage: cannot create new entities
        $current = self::countResourceActive($companyId, $resource);

        return $current < $limit;
    }

    /**
     * Можно ли реактивировать (вернуть is_active=true) сущность данного типа.
     * Поведение совпадает с canCreate: если активных < лимита, разрешено.
     * Используется во всех update-эндпоинтах, где is_active может стать true
     * (защита от обхода лимитов через deactivate → reactivate).
     */
    public static function canActivate(int $companyId, string $resource): bool
    {
        return self::canCreate($companyId, $resource);
    }

    public static function hasAccess(int $companyId, string $feature): bool
    {
        $plan = self::getPlanForCompany($companyId);
        if (!$plan) {
            return false;
        }

        return $plan->hasFeature($feature);
    }

    /**
     * @return array{error: string, message: string, resource: string, current: int, limit: int}
     */
    public static function limitExceededPayload(int $companyId, string $resource): array
    {
        $featureKey = self::RESOURCE_TO_FEATURE[$resource] ?? 'max_team_members';
        $plan = self::getPlanForCompany($companyId);

        $limit = $plan ? (int) $plan->getFeature($featureKey, 0) : 0;
        $current = self::countResourceActive($companyId, $resource);

        return [
            'error' => 'subscription_limit_reached',
            'message' => 'Subscription limit reached for this resource.',
            'resource' => $resource,
            'current' => $current,
            'limit' => $limit,
        ];
    }

    public static function countResourceActive(int $companyId, string $resource): int
    {
        return match ($resource) {
            'team_members' => self::countTeamMembersActive($companyId),
            'services' => self::countServicesActive($companyId),
            'advertisements' => self::countMarketplaceAdvertisementsActive($companyId),
            default => 0,
        };
    }

    private static function countResourceTotal(int $companyId, string $resource): int
    {
        return match ($resource) {
            'team_members' => self::countTeamMembersTotalAll($companyId),
            'services' => self::countServicesTotal($companyId),
            'advertisements' => self::countMarketplaceAdvertisementsTotal($companyId),
            default => 0,
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function listOverLimitItems(int $companyId, string $resource): array
    {
        return match ($resource) {
            'team_members' => self::listTeamMemberItems($companyId),
            'services' => self::listServiceItems($companyId),
            'advertisements' => self::listAdvertisementItems($companyId),
            default => [],
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function listTeamMemberItems(int $companyId): array
    {
        $items = [];

        $specialists = TeamMember::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'email', 'is_active']);

        foreach ($specialists as $tm) {
            $items[] = [
                'id' => $tm->id,
                'type' => 'team_member',
                'name' => $tm->name,
                'email' => $tm->email,
                'is_active' => (bool) $tm->is_active,
            ];
        }

        $staff = CompanyUser::where('company_id', $companyId)
            ->where('is_active', true)
            ->with('user:id,email')
            ->get();

        foreach ($staff as $cu) {
            $items[] = [
                'id' => $cu->id,
                'type' => 'company_user',
                'user_id' => $cu->user_id,
                'name' => $cu->user?->email ?? ('#'.$cu->user_id),
                'email' => $cu->user?->email,
                'is_active' => (bool) $cu->is_active,
            ];
        }

        return $items;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function listServiceItems(int $companyId): array
    {
        return Service::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Service $s) => [
                'id' => $s->id,
                'type' => 'service',
                'name' => $s->name,
                'is_active' => (bool) $s->is_active,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function listAdvertisementItems(int $companyId): array
    {
        return self::marketplaceAdvertisementsQuery($companyId)
            ->where('is_active', true)
            ->orderBy('id')
            ->get()
            ->map(fn (Advertisement $a) => [
                'id' => $a->id,
                'type' => 'advertisement',
                'name' => $a->title,
                'is_active' => (bool) $a->is_active,
            ])
            ->values()
            ->all();
    }

    private static function marketplaceAdvertisementsQuery(int $companyId): Builder
    {
        return Advertisement::query()
            ->where('company_id', $companyId)
            ->where(function ($q) {
                $q->whereIn('type', [Advertisement::TYPE_MARKETPLACE, Advertisement::TYPE_REGULAR])
                    ->orWhereNull('type');
            });
    }

    private static function countMarketplaceAdvertisementsActive(int $companyId): int
    {
        return (int) self::marketplaceAdvertisementsQuery($companyId)
            ->where('is_active', true)
            ->count();
    }

    private static function countMarketplaceAdvertisementsTotal(int $companyId): int
    {
        return (int) self::marketplaceAdvertisementsQuery($companyId)->count();
    }

    private static function countServicesActive(int $companyId): int
    {
        return (int) Service::where('company_id', $companyId)
            ->where('is_active', true)
            ->count();
    }

    private static function countServicesTotal(int $companyId): int
    {
        return (int) Service::where('company_id', $companyId)->count();
    }

    /**
     * Активные специалисты + активные сотрудники (приглашённые).
     */
    private static function countTeamMembersActive(int $companyId): int
    {
        $specialists = TeamMember::where('company_id', $companyId)
            ->where('is_active', true)
            ->count();
        $staff = CompanyUser::where('company_id', $companyId)
            ->where('is_active', true)
            ->count();

        return (int) ($specialists + $staff);
    }

    /**
     * Все специалисты + все приглашённые (включая неактивных по membership).
     */
    private static function countTeamMembersTotalAll(int $companyId): int
    {
        $specialists = TeamMember::where('company_id', $companyId)->count();
        $staff = CompanyUser::where('company_id', $companyId)->count();

        return (int) ($specialists + $staff);
    }

    /**
     * @return array<string, int|bool>
     */
    private static function buildNumericUsageExtended(int $currentActive, int $totalAll, int $limit): array
    {
        $unlimited = $limit < 0;
        $overBy = $unlimited ? 0 : max(0, $currentActive - $limit);

        return [
            'current' => $currentActive,
            'total' => $totalAll,
            'limit' => $unlimited ? 0 : $limit,
            'unlimited' => $unlimited,
            'over_limit' => !$unlimited && $overBy > 0,
            'over_by' => $overBy,
        ];
    }

    private static function emptyUsage(): array
    {
        $emptyBlock = [
            'current' => 0,
            'total' => 0,
            'limit' => 0,
            'unlimited' => false,
            'over_limit' => false,
            'over_by' => 0,
        ];

        return [
            'team_members' => $emptyBlock,
            'services' => $emptyBlock,
            'advertisements' => $emptyBlock,
            'analytics' => ['allowed' => false],
            'api_access' => ['allowed' => false],
            'priority_support' => ['allowed' => false],
            'routes' => ['allowed' => false],
            'grace_period_ends_at' => null,
            'grace_period_active' => false,
            'is_over_limit' => false,
            'scheduled_plan' => null,
        ];
    }
}
