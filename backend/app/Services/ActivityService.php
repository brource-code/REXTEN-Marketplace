<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use App\Models\Company;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityService
{
    /**
     * Логировать действие
     */
    public static function log(
        string $action,
        string $segment,
        string $category,
        ?string $entityType = null,
        ?int $entityId = null,
        ?string $entityName = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $description = null,
        ?int $companyId = null,
        ?int $userId = null,
        ?array $metadata = null
    ): ActivityLog {
        $user = Auth::user();
        
        return ActivityLog::create([
            'user_id' => $userId ?? $user?->id,
            'company_id' => $companyId ?? self::resolveCompanyId($user, $entityType, $entityId),
            'action' => $action,
            'segment' => $segment,
            'category' => $category,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'entity_name' => $entityName,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'description' => $description,
            'metadata' => $metadata,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    /**
     * Определить company_id из контекста
     */
    private static function resolveCompanyId(?User $user, ?string $entityType, ?int $entityId): ?int
    {
        // Если сущность - компания, используем её ID
        if ($entityType === 'Company' && $entityId) {
            return $entityId;
        }

        // Если у пользователя есть компания
        if ($user && $user->company_id) {
            return $user->company_id;
        }

        return null;
    }

    // ========== Авторизация ==========

    /**
     * Основная компания для логов (владелец / сотрудник).
     */
    public static function resolvePrimaryCompanyIdForUser(User $user): ?int
    {
        if ($user->role === 'BUSINESS_OWNER') {
            $id = $user->ownedCompanies()->orderBy('id')->value('id');
            return $id ? (int) $id : null;
        }
        $cu = $user->companyUsers()->where('is_active', true)->orderBy('company_id')->first();

        return $cu ? (int) $cu->company_id : null;
    }

    public static function logLogin(User $user): ActivityLog
    {
        $segment = self::getUserSegment($user);
        $companyId = self::resolvePrimaryCompanyIdForUser($user);

        return self::log(
            ActivityLog::ACTION_LOGIN,
            $segment,
            ActivityLog::CATEGORY_AUTH,
            'User',
            $user->id,
            $user->email,
            null,
            null,
            "Пользователь {$user->email} вошел в систему",
            $companyId,
            $user->id
        );
    }

    public static function logLogout(User $user): ActivityLog
    {
        $segment = self::getUserSegment($user);
        $companyId = self::resolvePrimaryCompanyIdForUser($user);

        return self::log(
            ActivityLog::ACTION_LOGOUT,
            $segment,
            ActivityLog::CATEGORY_AUTH,
            'User',
            $user->id,
            $user->email,
            null,
            null,
            "Пользователь {$user->email} вышел из системы",
            $companyId,
            $user->id
        );
    }

    public static function logRegister(User $user): ActivityLog
    {
        $segment = self::getUserSegment($user);
        
        return self::log(
            ActivityLog::ACTION_REGISTER,
            $segment,
            ActivityLog::CATEGORY_AUTH,
            'User',
            $user->id,
            $user->email,
            null,
            ['email' => $user->email, 'role' => $user->role],
            "Новая регистрация: {$user->email}",
            self::resolvePrimaryCompanyIdForUser($user),
            $user->id
        );
    }

    // ========== Компании ==========

    public static function logCompanyCreated(Company $company, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_SYSTEM;
        
        return self::log(
            ActivityLog::ACTION_CREATE,
            $segment,
            ActivityLog::CATEGORY_COMPANY,
            'Company',
            $company->id,
            $company->name,
            null,
            $company->toArray(),
            "Создана компания: {$company->name}",
            $company->id,
            $actor?->id
        );
    }

    public static function logCompanyUpdated(Company $company, array $oldValues, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_SYSTEM;
        
        return self::log(
            ActivityLog::ACTION_UPDATE,
            $segment,
            ActivityLog::CATEGORY_COMPANY,
            'Company',
            $company->id,
            $company->name,
            $oldValues,
            $company->toArray(),
            "Обновлена компания: {$company->name}",
            $company->id,
            $actor?->id
        );
    }

    public static function logCompanyApproved(Company $company, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        
        return self::log(
            ActivityLog::ACTION_APPROVE,
            ActivityLog::SEGMENT_ADMIN,
            ActivityLog::CATEGORY_COMPANY,
            'Company',
            $company->id,
            $company->name,
            ['status' => 'pending'],
            ['status' => 'active'],
            "Компания одобрена: {$company->name}",
            $company->id,
            $actor?->id
        );
    }

    public static function logCompanyRejected(Company $company, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        
        return self::log(
            ActivityLog::ACTION_REJECT,
            ActivityLog::SEGMENT_ADMIN,
            ActivityLog::CATEGORY_COMPANY,
            'Company',
            $company->id,
            $company->name,
            ['status' => 'pending'],
            ['status' => 'rejected'],
            "Компания отклонена: {$company->name}",
            $company->id,
            $actor?->id
        );
    }

    public static function logCompanyBlocked(Company $company, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        
        return self::log(
            ActivityLog::ACTION_BLOCK,
            ActivityLog::SEGMENT_ADMIN,
            ActivityLog::CATEGORY_COMPANY,
            'Company',
            $company->id,
            $company->name,
            ['status' => $company->getOriginal('status')],
            ['status' => 'suspended'],
            "Компания заблокирована: {$company->name}",
            $company->id,
            $actor?->id
        );
    }

    public static function logCompanyUnblocked(Company $company, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();

        return self::log(
            ActivityLog::ACTION_UNBLOCK,
            ActivityLog::SEGMENT_ADMIN,
            ActivityLog::CATEGORY_COMPANY,
            'Company',
            $company->id,
            $company->name,
            ['status' => 'suspended'],
            ['status' => 'active'],
            "Компания разблокирована: {$company->name}",
            $company->id,
            $actor?->id
        );
    }

    // ========== Пользователи ==========

    public static function logUserCreated(User $user, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_SYSTEM;
        
        return self::log(
            ActivityLog::ACTION_CREATE,
            $segment,
            ActivityLog::CATEGORY_USER,
            'User',
            $user->id,
            $user->email,
            null,
            ['email' => $user->email, 'role' => $user->role],
            "Создан пользователь: {$user->email}",
            $user->company_id,
            $actor?->id
        );
    }

    public static function logUserUpdated(User $user, array $oldValues, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_SYSTEM;
        
        return self::log(
            ActivityLog::ACTION_UPDATE,
            $segment,
            ActivityLog::CATEGORY_USER,
            'User',
            $user->id,
            $user->email,
            $oldValues,
            ['email' => $user->email, 'role' => $user->role],
            "Обновлен пользователь: {$user->email}",
            $user->company_id,
            $actor?->id
        );
    }

    public static function logUserBlocked(User $user, ?User $actor = null, ?int $companyId = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();

        return self::log(
            ActivityLog::ACTION_BLOCK,
            ActivityLog::SEGMENT_ADMIN,
            ActivityLog::CATEGORY_USER,
            'User',
            $user->id,
            $user->email,
            ['status' => 'active'],
            ['status' => 'blocked'],
            "Пользователь заблокирован: {$user->email}",
            $companyId ?? $user->company_id,
            $actor?->id
        );
    }

    public static function logUserUnblocked(User $user, ?User $actor = null, ?int $companyId = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();

        return self::log(
            ActivityLog::ACTION_UNBLOCK,
            ActivityLog::SEGMENT_ADMIN,
            ActivityLog::CATEGORY_USER,
            'User',
            $user->id,
            $user->email,
            ['status' => 'blocked'],
            ['status' => 'active'],
            "Пользователь разблокирован: {$user->email}",
            $companyId ?? $user->company_id,
            $actor?->id
        );
    }

    // ========== Бронирования ==========

    public static function logBookingCreated($booking, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_CLIENT;
        
        $dateVal = $booking->booking_date;
        if ($dateVal instanceof \DateTimeInterface) {
            $dateVal = $dateVal->format('Y-m-d');
        }

        return self::log(
            ActivityLog::ACTION_CREATE,
            $segment,
            ActivityLog::CATEGORY_BOOKING,
            'Booking',
            $booking->id,
            "Бронирование #{$booking->id}",
            null,
            [
                'service_id' => $booking->service_id,
                'date' => $dateVal,
                'time' => $booking->booking_time,
                'status' => $booking->status,
            ],
            "Создано бронирование #{$booking->id}",
            $booking->company_id,
            $actor?->id
        );
    }

    public static function logBookingCancelled($booking, ?User $actor = null, ?string $previousStatus = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_SYSTEM;
        
        return self::log(
            ActivityLog::ACTION_CANCEL,
            $segment,
            ActivityLog::CATEGORY_BOOKING,
            'Booking',
            $booking->id,
            "Бронирование #{$booking->id}",
            ['status' => $previousStatus ?? $booking->getOriginal('status')],
            ['status' => 'cancelled'],
            "Бронирование #{$booking->id} отменено",
            $booking->company_id,
            $actor?->id
        );
    }

    public static function logBookingCompleted($booking, ?User $actor = null, ?string $previousStatus = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_BUSINESS;
        
        return self::log(
            ActivityLog::ACTION_COMPLETE,
            $segment,
            ActivityLog::CATEGORY_BOOKING,
            'Booking',
            $booking->id,
            "Бронирование #{$booking->id}",
            ['status' => $previousStatus ?? $booking->getOriginal('status')],
            ['status' => 'completed'],
            "Бронирование #{$booking->id} завершено",
            $booking->company_id,
            $actor?->id
        );
    }

    public static function logBookingConfirmed($booking, ?User $actor = null, ?string $previousStatus = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_BUSINESS;
        
        return self::log(
            ActivityLog::ACTION_CONFIRM,
            $segment,
            ActivityLog::CATEGORY_BOOKING,
            'Booking',
            $booking->id,
            "Бронирование #{$booking->id}",
            ['status' => $previousStatus ?? $booking->getOriginal('status')],
            ['status' => 'confirmed'],
            "Бронирование #{$booking->id} подтверждено",
            $booking->company_id,
            $actor?->id
        );
    }

    // ========== Объявления ==========

    public static function logAdvertisementCreated($advertisement, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_BUSINESS;
        
        return self::log(
            ActivityLog::ACTION_CREATE,
            $segment,
            ActivityLog::CATEGORY_ADVERTISEMENT,
            'Advertisement',
            $advertisement->id,
            $advertisement->title,
            null,
            ['title' => $advertisement->title, 'type' => $advertisement->type],
            "Создано объявление: {$advertisement->title}",
            $advertisement->company_id,
            $actor?->id
        );
    }

    public static function logAdvertisementUpdated($advertisement, array $oldValues, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_BUSINESS;
        
        return self::log(
            ActivityLog::ACTION_UPDATE,
            $segment,
            ActivityLog::CATEGORY_ADVERTISEMENT,
            'Advertisement',
            $advertisement->id,
            $advertisement->title,
            $oldValues,
            ['title' => $advertisement->title, 'type' => $advertisement->type],
            "Обновлено объявление: {$advertisement->title}",
            $advertisement->company_id,
            $actor?->id
        );
    }

    public static function logAdvertisementApproved($advertisement, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        
        return self::log(
            ActivityLog::ACTION_APPROVE,
            ActivityLog::SEGMENT_ADMIN,
            ActivityLog::CATEGORY_ADVERTISEMENT,
            'Advertisement',
            $advertisement->id,
            $advertisement->title,
            ['status' => 'pending'],
            ['status' => 'approved'],
            "Объявление одобрено: {$advertisement->title}",
            $advertisement->company_id,
            $actor?->id
        );
    }

    public static function logAdvertisementRejected($advertisement, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        
        return self::log(
            ActivityLog::ACTION_REJECT,
            ActivityLog::SEGMENT_ADMIN,
            ActivityLog::CATEGORY_ADVERTISEMENT,
            'Advertisement',
            $advertisement->id,
            $advertisement->title,
            ['status' => 'pending'],
            ['status' => 'rejected'],
            "Объявление отклонено: {$advertisement->title}",
            $advertisement->company_id,
            $actor?->id
        );
    }

    // ========== Отзывы ==========

    public static function logReviewCreated($review, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        
        return self::log(
            ActivityLog::ACTION_CREATE,
            ActivityLog::SEGMENT_CLIENT,
            ActivityLog::CATEGORY_REVIEW,
            'Review',
            $review->id,
            "Отзыв #{$review->id}",
            null,
            ['rating' => $review->rating, 'comment' => $review->comment],
            "Оставлен отзыв с рейтингом {$review->rating}",
            $review->company_id,
            $actor?->id
        );
    }

    // ========== Услуги ==========

    public static function logServiceCreated($service, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_BUSINESS;
        
        return self::log(
            ActivityLog::ACTION_CREATE,
            $segment,
            ActivityLog::CATEGORY_SERVICE,
            'Service',
            $service->id,
            $service->name,
            null,
            ['name' => $service->name, 'price' => $service->price],
            "Создана услуга: {$service->name}",
            $service->company_id,
            $actor?->id
        );
    }

    public static function logServiceUpdated($service, array $oldValues, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_BUSINESS;
        
        return self::log(
            ActivityLog::ACTION_UPDATE,
            $segment,
            ActivityLog::CATEGORY_SERVICE,
            'Service',
            $service->id,
            $service->name,
            $oldValues,
            ['name' => $service->name, 'price' => $service->price],
            "Обновлена услуга: {$service->name}",
            $service->company_id,
            $actor?->id
        );
    }

    public static function logServiceDeleted($service, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_BUSINESS;
        
        return self::log(
            ActivityLog::ACTION_DELETE,
            $segment,
            ActivityLog::CATEGORY_SERVICE,
            'Service',
            $service->id,
            $service->name,
            ['name' => $service->name, 'price' => $service->price],
            null,
            "Удалена услуга: {$service->name}",
            $service->company_id,
            $actor?->id
        );
    }

    // ========== Настройки ==========

    public static function logSettingsUpdated(string $settingsType, array $oldValues, array $newValues, ?User $actor = null): ActivityLog
    {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_ADMIN;
        
        return self::log(
            ActivityLog::ACTION_UPDATE,
            $segment,
            ActivityLog::CATEGORY_SETTINGS,
            'Settings',
            null,
            $settingsType,
            $oldValues,
            $newValues,
            "Обновлены настройки: {$settingsType}",
            null,
            $actor?->id
        );
    }

    // ========== Вспомогательные методы ==========

    /**
     * Определить сегмент пользователя по его роли
     */
    private static function getUserSegment(User $user): string
    {
        return match ($user->role) {
            'SUPERADMIN' => ActivityLog::SEGMENT_ADMIN,
            'BUSINESS_OWNER' => ActivityLog::SEGMENT_BUSINESS,
            'CLIENT' => ActivityLog::SEGMENT_CLIENT,
            default => ActivityLog::SEGMENT_SYSTEM,
        };
    }

    /**
     * Универсальный метод для логирования любого действия
     */
    public static function logAction(
        string $action,
        string $entityType,
        $entity,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $description = null,
        ?User $actor = null
    ): ActivityLog {
        $actor = $actor ?? Auth::user();
        $segment = $actor ? self::getUserSegment($actor) : ActivityLog::SEGMENT_SYSTEM;
        
        $category = self::resolveCategoryFromEntityType($entityType);
        $companyId = self::resolveCompanyIdFromEntity($entity);
        $entityName = self::resolveEntityName($entity);
        
        return self::log(
            $action,
            $segment,
            $category,
            $entityType,
            $entity->id ?? null,
            $entityName,
            $oldValues,
            $newValues,
            $description,
            $companyId,
            $actor?->id
        );
    }

    private static function resolveCategoryFromEntityType(string $entityType): string
    {
        return match ($entityType) {
            'Company' => ActivityLog::CATEGORY_COMPANY,
            'User' => ActivityLog::CATEGORY_USER,
            'Booking' => ActivityLog::CATEGORY_BOOKING,
            'Advertisement' => ActivityLog::CATEGORY_ADVERTISEMENT,
            'Review' => ActivityLog::CATEGORY_REVIEW,
            'Service' => ActivityLog::CATEGORY_SERVICE,
            'Settings' => ActivityLog::CATEGORY_SETTINGS,
            default => 'other',
        };
    }

    private static function resolveCompanyIdFromEntity($entity): ?int
    {
        if ($entity instanceof Company) {
            return $entity->id;
        }
        
        if (isset($entity->company_id)) {
            return $entity->company_id;
        }
        
        return null;
    }

    private static function resolveEntityName($entity): ?string
    {
        if (isset($entity->name)) {
            return $entity->name;
        }
        
        if (isset($entity->title)) {
            return $entity->title;
        }
        
        if (isset($entity->email)) {
            return $entity->email;
        }
        
        if (isset($entity->id)) {
            return "#{$entity->id}";
        }
        
        return null;
    }
}
