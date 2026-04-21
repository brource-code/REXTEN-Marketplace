<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Client\ProfileController;
use App\Http\Controllers\Client\OrdersController;
use App\Http\Controllers\Client\BookingsController;
use App\Http\Controllers\Client\ReviewsController;
use App\Http\Controllers\Client\FavoritesController;
use App\Http\Controllers\Client\NotificationsController;
use App\Http\Controllers\Business\DashboardController;
use App\Http\Controllers\Business\ScheduleController;
use App\Http\Controllers\Business\RecurringBookingController;
use App\Http\Controllers\Business\ClientsController;
use App\Http\Controllers\Business\SettingsController;
use App\Http\Controllers\Business\BookingsController as BusinessBookingsController;
use App\Http\Controllers\Business\BookingActivitiesController as BusinessBookingActivitiesController;
use App\Http\Controllers\Business\ReviewsController as BusinessReviewsController;
use App\Http\Controllers\Business\ReportsController;
use App\Http\Controllers\Business\SalaryController;
use App\Http\Controllers\Business\CompanyUsersController;
use App\Http\Controllers\Business\CompanyRolesController;
use App\Http\Controllers\Business\NotificationsController as BusinessNotificationsController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\CompaniesController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Controllers\Admin\AdvertisementsController;
use App\Http\Controllers\Admin\ReviewsController as AdminReviewsController;
use App\Http\Controllers\Admin\CategoriesController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\AdditionalServicesController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\BillingController;
use App\Http\Controllers\Admin\BusinessEventsController;
use App\Http\Controllers\Admin\HealthController;
use App\Http\Controllers\Admin\BackupsController;
use App\Http\Controllers\Admin\KnowledgeTopicsController;
use App\Http\Controllers\Admin\KnowledgeArticlesController;
use App\Http\Controllers\Admin\KnowledgeMediaController;
use App\Http\Controllers\Admin\NotificationsController as AdminNotificationsController;
use App\Http\Controllers\Admin\SupportTicketsController as AdminSupportTicketsController;
use App\Http\Controllers\Business\KnowledgeBaseController;
use App\Http\Controllers\Business\SupportTicketsController as BusinessSupportTicketsController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\DiscountPreviewController;
use App\Http\Controllers\Business\DiscountTierController;
use App\Http\Controllers\Business\PromoCodeController;
use App\Http\Controllers\Business\CompanyDiscountSettingsController;
use App\Http\Controllers\Client\ClientDiscountsController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\Public\ReviewController;
use App\Http\Controllers\Public\EnterpriseLeadController;
use App\Http\Controllers\FamilyBudgetController;
use App\Http\Controllers\FamilyBudget\FamilyBudgetApiController;
use App\Http\Controllers\StripeController;
use App\Http\Controllers\Business\StripeConnectController;
use App\Http\Controllers\Business\SubscriptionController;
use App\Http\Controllers\Business\SearchController as BusinessSearchController;
use App\Http\Controllers\Business\RouteController;
use App\Http\Controllers\Admin\SearchController as AdminSearchController;
use App\Http\Controllers\Admin\RealtimeMetricsController;
use App\Http\Controllers\UserPresenceController;
use App\Http\Controllers\Api\V1\BookingsController as ApiV1BookingsController;
use App\Http\Controllers\Api\V1\ClientsController as ApiV1ClientsController;
use App\Http\Controllers\Api\V1\MeController as ApiV1MeController;
use App\Http\Controllers\Api\V1\ReviewsController as ApiV1ReviewsController;
use App\Http\Controllers\Api\V1\ScheduleController as ApiV1ScheduleController;
use App\Http\Controllers\Api\V1\ServicesController as ApiV1ServicesController;
use App\Http\Controllers\Api\V1\TeamMembersController as ApiV1TeamMembersController;
use App\Http\Controllers\Business\ApiTokensController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Read-only public API v1 (Bearer Sanctum token; Enterprise api_access)
Route::prefix('v1')->middleware([
    'auth:sanctum',
    'tenant.api',
    'subscription.feature:api_access',
    'throttle:api_v1',
    'api.v1.read',
    'log.api_v1',
])->group(function () {
    Route::get('/me', [ApiV1MeController::class, 'show']);
    Route::get('/services', [ApiV1ServicesController::class, 'index']);
    Route::get('/services/{id}', [ApiV1ServicesController::class, 'show'])->whereNumber('id');
    Route::get('/clients', [ApiV1ClientsController::class, 'index']);
    Route::get('/clients/{id}', [ApiV1ClientsController::class, 'show'])->whereNumber('id');
    Route::get('/bookings', [ApiV1BookingsController::class, 'index']);
    Route::get('/bookings/{id}', [ApiV1BookingsController::class, 'show'])->whereNumber('id');
    Route::get('/team-members', [ApiV1TeamMembersController::class, 'index']);
    Route::get('/reviews', [ApiV1ReviewsController::class, 'index']);
    Route::get('/schedule', [ApiV1ScheduleController::class, 'index']);
});

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('throttle:10,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    Route::post('/email/verify-code', [\App\Http\Controllers\Auth\EmailOtpController::class, 'verify'])
        ->middleware('throttle:15,1');
    Route::post('/email/resend-code', [\App\Http\Controllers\Auth\EmailOtpController::class, 'resend'])
        ->middleware('throttle:8,1');

    // Google OAuth routes - требуют сессии для Socialite
    Route::middleware([
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\Cookie\Middleware\EncryptCookies::class,
    ])->group(function () {
        Route::get('/google/redirect', [GoogleAuthController::class, 'redirect']);
        Route::get('/google/callback', [GoogleAuthController::class, 'callback']);
    });
});

// Public location routes
Route::prefix('locations')->group(function () {
    Route::get('/states', [LocationController::class, 'getStates']);
    Route::get('/cities', [LocationController::class, 'getCities']);
    Route::get('/search', [LocationController::class, 'search']);
    Route::get('/validate', [LocationController::class, 'validateLocation']);
});

// Public marketplace routes
Route::prefix('marketplace')->group(function () {
    Route::get('/services', [MarketplaceController::class, 'getServices']);
    Route::get('/categories', [MarketplaceController::class, 'getCategories']);
    Route::get('/states', [MarketplaceController::class, 'getStates']);
    Route::get('/services/{slug}', [MarketplaceController::class, 'getServiceBySlug']);
    Route::get('/services/{slug}/profile', [MarketplaceController::class, 'getServiceProfile']);
    Route::get('/company/{slug}', [MarketplaceController::class, 'getCompanyProfile']);
});

// Public advertisements (for services page)
Route::get('/advertisements/featured', [AdvertisementsController::class, 'getFeatured']);
Route::post('/advertisements/{id}/click', [AdvertisementsController::class, 'trackClick']);
Route::post('/advertisements/{id}/impression', [AdvertisementsController::class, 'trackImpression']);

// Public additional services routes
Route::prefix('additional-services')->group(function () {
    Route::get('/by-advertisement/{advertisementId}', [AdditionalServicesController::class, 'byAdvertisement']);
});

// Public services routes
Route::prefix('services')->group(function () {
    Route::get('/by-advertisement/{advertisementId}', [ServiceController::class, 'byAdvertisement']);
});

// Public booking routes
Route::prefix('bookings')->group(function () {
    Route::post('/', [BookingController::class, 'store']);
    Route::post('/preview-discount', [DiscountPreviewController::class, 'preview']);
    Route::get('/available-slots', [BookingController::class, 'getAvailableSlots']);
    Route::post('/available-slots-batch', [BookingController::class, 'getAvailableSlotsBatch']);
    Route::post('/check-availability', [BookingController::class, 'checkAvailability']);
    Route::get('/{id}/payment-eligibility', [StripeController::class, 'getBookingPaymentEligibility']);
    Route::post('/{id}/pay', [StripeController::class, 'createClientBookingPayment'])
        ->middleware('throttle:5,1');
});

// Public platform settings (for logo customization)
Route::get('/settings/public', [AdminSettingsController::class, 'getPublicSettings']);
Route::get('/subscription-plans/public', [SubscriptionController::class, 'publicPlans']);

/** Публичный pk-токен Mapbox: в Docker nginx весь /api идёт в Laravel, не в Next.js — см. frontend RouteMap.jsx */
Route::get('/business/mapbox-config', function () {
    $raw = config('services.mapbox.public_token');
    $accessToken = is_string($raw) ? trim($raw) : '';

    return response()->json(['accessToken' => $accessToken]);
});

// Public review routes (for unregistered clients)
Route::prefix('public/reviews')->group(function () {
    Route::get('/token/{token}', [ReviewController::class, 'showByToken']);
    Route::post('/token/{token}', [ReviewController::class, 'storeByToken']);
});

// Public enterprise lead form (landing pricing → email to sales)
Route::post('/enterprise-lead', [EnterpriseLeadController::class, 'store'])
    ->middleware('throttle:5,1');

// Family Budget routes (public, no auth required)
Route::prefix('family-budget')->group(function () {
    Route::post('/ai-report', [FamilyBudgetController::class, 'getAiReport']);
});

// Family Budget protected routes (require auth)
Route::prefix('family-budget')->middleware(['jwt.auth'])->group(function () {
    Route::get('/', [FamilyBudgetApiController::class, 'index']);
    Route::put('/settings', [FamilyBudgetApiController::class, 'updateSettings']);
    Route::get('/events', [FamilyBudgetApiController::class, 'getEvents']);
    Route::post('/events', [FamilyBudgetApiController::class, 'storeEvent']);
    Route::put('/events/{id}', [FamilyBudgetApiController::class, 'updateEvent']);
    Route::delete('/events/{id}', [FamilyBudgetApiController::class, 'destroyEvent']);
    Route::post('/sync', [FamilyBudgetApiController::class, 'syncEvents']);
    Route::delete('/clear', [FamilyBudgetApiController::class, 'clearAll']);
});

// Stripe webhooks (public, no auth - Stripe sends directly)
// Один endpoint для всех событий (включая Connect)
Route::post('/stripe/webhook', [StripeController::class, 'handleWebhook']);

// Sentry → Telegram webhook (public, no auth - Sentry sends directly)
Route::post('/webhooks/sentry-telegram', [\App\Http\Controllers\Webhooks\SentryTelegramController::class, 'handle']);

// Telegram business bot webhook (public, защищён secret-токеном из заголовка)
Route::post('/webhooks/telegram-business', [\App\Http\Controllers\Webhooks\TelegramBusinessController::class, 'handle']);

// Protected routes
Route::middleware(['jwt.auth'])->group(function () {
    // Auth routes
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    Route::post('/user/presence', [UserPresenceController::class, 'heartbeat']);

    // Universal user profile routes (for BUSINESS_OWNER and SUPERADMIN only, not CLIENT)
    // Обновление языка пользователя (для всех авторизованных)
    Route::put('/user/locale', [\App\Http\Controllers\Client\ProfileController::class, 'updateLocale']);
    
    Route::prefix('user')->middleware(['role:BUSINESS_OWNER,SUPERADMIN'])->group(function () {
        Route::get('/profile', [\App\Http\Controllers\Client\ProfileController::class, 'show']);
        Route::put('/profile', [\App\Http\Controllers\Client\ProfileController::class, 'update']);
        Route::post('/profile/avatar', [\App\Http\Controllers\Client\ProfileController::class, 'uploadAvatar']);
        Route::delete('/profile/avatar', [\App\Http\Controllers\Client\ProfileController::class, 'deleteAvatar']);
        Route::post('/profile/change-password', [\App\Http\Controllers\Client\ProfileController::class, 'changePassword']);
    });

    // Client routes
    Route::prefix('client')->middleware(['role:CLIENT', 'tenant'])->group(function () {
        // Profile
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
        Route::post('/profile/change-password', [ProfileController::class, 'changePassword']);

        // Orders
        Route::get('/orders', [OrdersController::class, 'index']);

        // Bookings
        Route::get('/bookings', [BookingsController::class, 'index']);
        Route::post('/bookings/{id}/cancel', [BookingsController::class, 'cancel']);

        // Скидки / лояльность
        Route::get('/discounts/loyalty', [ClientDiscountsController::class, 'loyaltyProgress']);

        // Reviews
        Route::get('/reviews', [ReviewsController::class, 'index']);
        Route::get('/reviews/pending', [ReviewsController::class, 'pending']);
        Route::post('/reviews', [ReviewsController::class, 'store']);

        // Favorites
        Route::get('/favorites/services', [FavoritesController::class, 'services']);
        Route::get('/favorites/businesses', [FavoritesController::class, 'businesses']);
        Route::get('/favorites/advertisements', [FavoritesController::class, 'advertisements']);
        Route::post('/favorites/{type}/{id}', [FavoritesController::class, 'add']);
        Route::delete('/favorites/{type}/{id}', [FavoritesController::class, 'remove']);

        // Notifications
        Route::get('/notifications', [NotificationsController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationsController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationsController::class, 'markAllAsRead']);
        Route::delete('/notifications/{id}', [NotificationsController::class, 'destroy']);
        Route::get('/notifications/settings', [NotificationsController::class, 'getSettings']);
        Route::put('/notifications/settings', [NotificationsController::class, 'updateSettings']);
    });

    // Business routes
    Route::prefix('business')->middleware(['role:BUSINESS_OWNER,SUPERADMIN', 'tenant'])->group(function () {
        Route::get('/search', BusinessSearchController::class);

        // Dashboard
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/dashboard/recent-bookings', [DashboardController::class, 'recentBookings']);
        Route::get('/dashboard/chart', [DashboardController::class, 'chart']);

        // Route Intelligence (daily routes / optimization)
        // Платная фича: только планы с features.routes=true (professional, enterprise).
        Route::prefix('routes')->middleware('subscription.feature:routes')->group(function () {
            Route::get('/{specialist}/saved', [RouteController::class, 'savedList'])
                ->whereNumber('specialist');
            Route::post('/{routeId}/recalculate', [RouteController::class, 'recalculate'])
                ->where('routeId', '[0-9a-fA-F\-]{36}');
            Route::put('/{specialist}/{date}/included-bookings', [RouteController::class, 'updateIncluded'])
                ->whereNumber('specialist')
                ->where('date', '[0-9]{4}-[0-9]{2}-[0-9]{2}');
            Route::put('/{specialist}/{date}/include-return-leg', [RouteController::class, 'updateIncludeReturnLeg'])
                ->whereNumber('specialist')
                ->where('date', '[0-9]{4}-[0-9]{2}-[0-9]{2}');
            Route::get('/{specialist}/{date}', [RouteController::class, 'show'])
                ->whereNumber('specialist')
                ->where('date', '[0-9]{4}-[0-9]{2}-[0-9]{2}');
            Route::post('/{specialist}/{date}/optimize/preview', [RouteController::class, 'optimizePreview'])
                ->whereNumber('specialist')
                ->where('date', '[0-9]{4}-[0-9]{2}-[0-9]{2}');
            Route::post('/{specialist}/{date}/optimize/apply', [RouteController::class, 'optimizeApply'])
                ->whereNumber('specialist')
                ->where('date', '[0-9]{4}-[0-9]{2}-[0-9]{2}');
        });

        // Schedule
        Route::get('/schedule/slots', [ScheduleController::class, 'index']);
        Route::post('/schedule/slots', [ScheduleController::class, 'store']);
        Route::put('/schedule/slots/{id}', [ScheduleController::class, 'update']);
        Route::delete('/schedule/slots/{id}', [ScheduleController::class, 'destroy']);

        // Recurring Bookings
        Route::get('/recurring-bookings', [RecurringBookingController::class, 'index']);
        Route::post('/recurring-bookings', [RecurringBookingController::class, 'store']);
        Route::put('/recurring-bookings/{id}', [RecurringBookingController::class, 'update']);
        Route::delete('/recurring-bookings/{id}', [RecurringBookingController::class, 'destroy']);
        Route::post('/recurring-bookings/{id}/regenerate', [RecurringBookingController::class, 'regenerate']);

        // Salary - должны быть ДО reports, чтобы избежать конфликтов
        Route::get('/salary/test', [SalaryController::class, 'testRoute']); // Тестовый роут
        Route::get('/salary', [SalaryController::class, 'index']);
        Route::post('/salary/calculate', [SalaryController::class, 'calculate']);
        // Более специфичные роуты должны быть выше общего роута /{id}
        // Используем явные имена для отладки
        Route::get('/salary/settings/{teamMemberId}', [SalaryController::class, 'getSettings'])
            ->where('teamMemberId', '[0-9]+')
            ->name('business.salary.settings.get');
        Route::put('/salary/settings/{teamMemberId}', [SalaryController::class, 'updateSettings'])
            ->where('teamMemberId', '[0-9]+')
            ->name('business.salary.settings.update');
        Route::post('/salary/settings/{teamMemberId}', [SalaryController::class, 'updateSettings'])
            ->where('teamMemberId', '[0-9]+')
            ->name('business.salary.settings.update.post');
        Route::get('/salary/export/{type}', [SalaryController::class, 'export'])->where('type', 'csv|excel');
        Route::get('/salary/{id}', [SalaryController::class, 'getDetails'])->where('id', '[0-9]+');

        // Reports (analytics feature required)
        Route::middleware('subscription.feature:analytics')->prefix('reports')->group(function () {
            Route::get('/', [ReportsController::class, 'index']);
            Route::get('/bookings', [ReportsController::class, 'bookings']);
            Route::get('/clients', [ReportsController::class, 'clients']);
            Route::get('/revenue', [ReportsController::class, 'revenue']);
            Route::get('/specialists', [ReportsController::class, 'specialists']);
            Route::get('/salary', [ReportsController::class, 'salary']);
            Route::get('/export/{type}', [ReportsController::class, 'export']);
        });

        // Скидки и промокоды
        Route::get('/discounts/settings', [CompanyDiscountSettingsController::class, 'show']);
        Route::put('/discounts/settings', [CompanyDiscountSettingsController::class, 'update']);
        Route::get('/discount-tiers', [DiscountTierController::class, 'index']);
        Route::post('/discount-tiers', [DiscountTierController::class, 'store']);
        Route::put('/discount-tiers/{id}', [DiscountTierController::class, 'update']);
        Route::delete('/discount-tiers/{id}', [DiscountTierController::class, 'destroy']);
        Route::get('/promo-codes', [PromoCodeController::class, 'index']);
        Route::post('/promo-codes', [PromoCodeController::class, 'store']);
        Route::put('/promo-codes/{id}', [PromoCodeController::class, 'update']);
        Route::delete('/promo-codes/{id}', [PromoCodeController::class, 'destroy']);

        // Clients
        Route::get('/clients', [ClientsController::class, 'index']);
        Route::post('/clients', [ClientsController::class, 'store']);
        Route::get('/clients/{id}', [ClientsController::class, 'show']);
        Route::put('/clients/{id}', [ClientsController::class, 'update']);
        Route::delete('/clients/{id}', [ClientsController::class, 'destroy']);
        Route::put('/clients/{id}/status', [ClientsController::class, 'updateStatus']);
        Route::post('/clients/{id}/avatar', [ClientsController::class, 'uploadAvatar']);
        Route::post('/clients/{id}/notes', [ClientsController::class, 'addNote']);

        // Bookings
        Route::get('/bookings', [BusinessBookingsController::class, 'index']);
        Route::get('/bookings/{id}', [BusinessBookingsController::class, 'show']);
        Route::post('/bookings', [BusinessBookingsController::class, 'store']);
        Route::put('/bookings/{id}', [BusinessBookingsController::class, 'update']);
        Route::patch('/bookings/{id}', [BusinessBookingsController::class, 'update']); // Добавлено для совместимости
        Route::delete('/bookings/{id}', [BusinessBookingsController::class, 'destroy']);

        // Booking activity log (Activity tab in BookingDrawer)
        Route::get('/bookings/{id}/activities', [BusinessBookingActivitiesController::class, 'index']);
        Route::post('/bookings/{id}/activities', [BusinessBookingActivitiesController::class, 'store']);

        // Reviews
        Route::get('/reviews', [BusinessReviewsController::class, 'index']);
        Route::put('/reviews/{id}/response', [BusinessReviewsController::class, 'updateResponse']);

        // Settings
        Route::get('/settings/profile', [SettingsController::class, 'getProfile']);
        Route::put('/settings/profile', [SettingsController::class, 'updateProfile']);
        Route::post('/settings/profile/avatar', [SettingsController::class, 'uploadAvatar']);
        Route::get('/settings/services', [SettingsController::class, 'getServices']);
        Route::post('/settings/services', [SettingsController::class, 'createService']);
        Route::put('/settings/services/{id}', [SettingsController::class, 'updateService']);
        Route::delete('/settings/services/{id}', [SettingsController::class, 'deleteService']);
        
        // Additional Services for Business
        Route::prefix('settings/additional-services')->group(function () {
            Route::get('/', [AdditionalServicesController::class, 'index']);
            Route::post('/', [AdditionalServicesController::class, 'store']);
            Route::get('/{id}', [AdditionalServicesController::class, 'show']);
            Route::put('/{id}', [AdditionalServicesController::class, 'update']);
            Route::delete('/{id}', [AdditionalServicesController::class, 'destroy']);
        });
        Route::get('/settings/schedule', [SettingsController::class, 'getScheduleSettings']);
        Route::put('/settings/schedule', [SettingsController::class, 'updateScheduleSettings']);
        Route::get('/settings/team', [SettingsController::class, 'getTeam']);
        Route::post('/settings/team', [SettingsController::class, 'createTeamMember']);
        Route::put('/settings/team/{id}', [SettingsController::class, 'updateTeamMember']);
        Route::delete('/settings/team/{id}', [SettingsController::class, 'deleteTeamMember']);
        Route::get('/settings/portfolio', [SettingsController::class, 'getPortfolio']);
        Route::post('/settings/portfolio', [SettingsController::class, 'createPortfolioItem']);
        Route::delete('/settings/portfolio/{id}', [SettingsController::class, 'deletePortfolioItem']);
        
        // Advertisements
        Route::get('/settings/advertisements', [SettingsController::class, 'getAdvertisements']);
        Route::get('/settings/advertisements/{id}', [SettingsController::class, 'getAdvertisement']);
        Route::post('/settings/advertisements', [SettingsController::class, 'createAdvertisement']);
        Route::post('/settings/advertisements/upload-image', [SettingsController::class, 'uploadAdvertisementImage']);
        Route::put('/settings/advertisements/{id}', [SettingsController::class, 'updateAdvertisement']);
        Route::patch('/settings/advertisements/{id}/visibility', [SettingsController::class, 'updateAdvertisementVisibility']);
        Route::delete('/settings/advertisements/{id}', [SettingsController::class, 'deleteAdvertisement']);
        
        // Stripe payment
        Route::post('/stripe/checkout-session', [StripeController::class, 'createCheckoutSession']);
        Route::get('/stripe/transactions', [StripeController::class, 'getTransactions']);
        Route::get('/stripe/booking-payments', [StripeController::class, 'getBookingPayments']);

        // Stripe Connect (Express accounts for businesses)
        Route::post('/stripe/connect', [StripeConnectController::class, 'createAccount']);
        Route::get('/stripe/connect/refresh', [StripeConnectController::class, 'refreshAccountLink']);
        Route::get('/stripe/connect/status', [StripeConnectController::class, 'getAccountStatus']);
        Route::post('/stripe/connect/dashboard', [StripeConnectController::class, 'getDashboardLink']);
        Route::post('/stripe/connect/disconnect', [StripeConnectController::class, 'disconnect']);

        // Booking payments (hold -> capture flow)
        Route::post('/bookings/{id}/pay', [StripeController::class, 'createBookingPayment'])
            ->middleware('throttle:5,1');
        Route::post('/bookings/{id}/capture', [StripeController::class, 'captureBookingPayment'])
            ->middleware('throttle:10,1');
        Route::post('/bookings/{id}/refund', [StripeController::class, 'refundBookingPayment'])
            ->middleware('throttle:10,1');

        // Subscriptions
        Route::get('/subscription/plans', [SubscriptionController::class, 'plans']);
        Route::get('/subscription/current', [SubscriptionController::class, 'current']);
        Route::get('/subscription/usage', [SubscriptionController::class, 'usage']);
        Route::post('/subscription/checkout', [SubscriptionController::class, 'createCheckoutSession']);
        Route::post('/subscription/change-plan', [SubscriptionController::class, 'changePlan']);
        Route::post('/subscription/cancel-scheduled-change', [SubscriptionController::class, 'cancelScheduledChange']);
        Route::get('/subscription/over-limit', [SubscriptionController::class, 'overLimit']);
        Route::post('/subscription/resolve-limits', [SubscriptionController::class, 'resolveLimits']);
        Route::post('/subscription/cancel', [SubscriptionController::class, 'cancel']);
        Route::post('/subscription/resume', [SubscriptionController::class, 'resume']);

        // Developer API — токены (Enterprise api_access)
        Route::prefix('api')->middleware('subscription.feature:api_access')->group(function () {
            Route::get('/tokens', [ApiTokensController::class, 'index']);
            Route::post('/tokens', [ApiTokensController::class, 'store']);
            Route::delete('/tokens/{id}', [ApiTokensController::class, 'destroy'])->whereNumber('id');
        });

        // Onboarding
        Route::post('/onboarding/complete', [SettingsController::class, 'completeOnboarding']);

        // База знаний (гайды платформы; без привязки к компании)
        Route::get('/knowledge/topics', [KnowledgeBaseController::class, 'topics']);
        Route::get('/knowledge/search-articles', [KnowledgeBaseController::class, 'searchArticles']);
        Route::get('/knowledge/popular-articles', [KnowledgeBaseController::class, 'popularArticles']);
        Route::get('/knowledge/topics/{topicSlug}/articles/{articleSlug}', [KnowledgeBaseController::class, 'articleBySlugs'])
            ->where('topicSlug', '[a-zA-Z0-9\-]+')
            ->where('articleSlug', '[a-zA-Z0-9\-]+');
        Route::get('/knowledge/topics/{topicSlug}', [KnowledgeBaseController::class, 'topicBySlug'])
            ->where('topicSlug', '[a-zA-Z0-9\-]+');
        Route::get('/knowledge/articles/{id}', [KnowledgeBaseController::class, 'article'])->where('id', '[0-9]+');

        // Поддержка (тикеты)
        Route::get('/support/tickets', [BusinessSupportTicketsController::class, 'index']);
        Route::get('/support/tickets/{id}', [BusinessSupportTicketsController::class, 'show'])->where('id', '[0-9]+');
        Route::post('/support/tickets', [BusinessSupportTicketsController::class, 'store']);
        
        // Marketplace Settings
        Route::get('/settings/marketplace', [SettingsController::class, 'getMarketplaceSettings']);
        Route::put('/settings/marketplace', [SettingsController::class, 'updateMarketplaceSettings']);
        
        // Notification Settings
        Route::get('/settings/notifications', [SettingsController::class, 'getNotificationSettings']);
        Route::put('/settings/notifications', [SettingsController::class, 'updateNotificationSettings']);

        // Telegram bot link (per-user: owner/staff)
        Route::get('/settings/telegram', [\App\Http\Controllers\Business\TelegramController::class, 'status']);
        Route::post('/settings/telegram/connect', [\App\Http\Controllers\Business\TelegramController::class, 'connect']);
        Route::delete('/settings/telegram', [\App\Http\Controllers\Business\TelegramController::class, 'disconnect']);

        // Notifications (list, read, delete)
        Route::get('/notifications', [BusinessNotificationsController::class, 'index']);
        Route::post('/notifications/{id}/read', [BusinessNotificationsController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [BusinessNotificationsController::class, 'markAllAsRead']);
        Route::delete('/notifications', [BusinessNotificationsController::class, 'destroyAll']);
        Route::delete('/notifications/{id}', [BusinessNotificationsController::class, 'destroy']);

        // Companies (owned + staff)
        Route::get('/companies', [CompanyUsersController::class, 'companies']);

        // Company Users (staff with roles)
        Route::get('/users', [CompanyUsersController::class, 'index']);
        Route::post('/users/invite', [CompanyUsersController::class, 'invite']);
        Route::put('/users/{id}/role', [CompanyUsersController::class, 'updateRole']);
        Route::delete('/users/{id}', [CompanyUsersController::class, 'destroy']);

        // Company Roles
        Route::get('/roles', [CompanyRolesController::class, 'index']);
        Route::get('/roles/permissions', [CompanyRolesController::class, 'permissions']);
        Route::post('/roles', [CompanyRolesController::class, 'store']);
        Route::put('/roles/{id}', [CompanyRolesController::class, 'update']);
        Route::delete('/roles/{id}', [CompanyRolesController::class, 'destroy']);
    });

    // Admin routes
    Route::prefix('admin')->middleware(['role:SUPERADMIN'])->group(function () {
        Route::get('/search', AdminSearchController::class);

        // Уведомления (суперадмин)
        Route::get('/notifications', [AdminNotificationsController::class, 'index']);
        Route::post('/notifications/{id}/read', [AdminNotificationsController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [AdminNotificationsController::class, 'markAllAsRead']);
        Route::delete('/notifications/{id}', [AdminNotificationsController::class, 'destroy']);

        // Поддержка (тикеты)
        Route::get('/support/tickets', [AdminSupportTicketsController::class, 'index']);
        Route::get('/support/tickets/{id}', [AdminSupportTicketsController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/support/tickets/{id}', [AdminSupportTicketsController::class, 'update'])->where('id', '[0-9]+');

        // Advertisements
        Route::get('/advertisements', [AdvertisementsController::class, 'index']);
        Route::post('/advertisements', [AdvertisementsController::class, 'store']);
        Route::post('/advertisements/upload-image', [AdvertisementsController::class, 'uploadImage']);
        Route::get('/advertisements/{id}', [AdvertisementsController::class, 'show']);
        Route::get('/advertisements/{id}/stats', [AdvertisementsController::class, 'getStats']);
        Route::put('/advertisements/{id}', [AdvertisementsController::class, 'update']);
        Route::post('/advertisements/{id}/approve', [AdvertisementsController::class, 'approve']);
        Route::post('/advertisements/{id}/reject', [AdvertisementsController::class, 'reject']);
        // Dashboard
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/dashboard/chart', [AdminDashboardController::class, 'chart']);
        Route::get('/dashboard/recent-activity', [AdminDashboardController::class, 'recentActivity']);
        Route::get('/dashboard/kpi', [AdminDashboardController::class, 'kpi']); // Phase 1B
        Route::get('/dashboard/trends', [AdminDashboardController::class, 'trends']); // Phase 1B

        Route::get('/realtime-metrics', [RealtimeMetricsController::class, 'index']);

        // Companies
        Route::get('/companies', [CompaniesController::class, 'index']);
        Route::post('/companies', [CompaniesController::class, 'store']);
        Route::get('/companies/{id}', [CompaniesController::class, 'show']);
        Route::get('/companies/{id}/stats', [CompaniesController::class, 'stats']);
        Route::get('/companies/{id}/chart', [CompaniesController::class, 'chart']);
        Route::get('/companies/{id}/team', [CompaniesController::class, 'getTeam']);
        Route::get('/companies/{id}/services', [CompaniesController::class, 'getServices']);
        Route::get('/companies/{id}/users', [CompaniesController::class, 'getUsers']);
        Route::get('/companies/{id}/roles', [CompaniesController::class, 'getCompanyRoles']);
        Route::put('/companies/{id}/users/{userId}', [CompaniesController::class, 'updateCompanyUser']);
        Route::put('/companies/{id}', [CompaniesController::class, 'update']);
        Route::delete('/companies/{id}', [CompaniesController::class, 'destroy']);
        Route::post('/companies/{id}/approve', [CompaniesController::class, 'approve']);
        Route::post('/companies/{id}/reject', [CompaniesController::class, 'reject']);
        Route::post('/companies/{id}/block', [CompaniesController::class, 'block']);
        Route::post('/companies/{id}/unblock', [CompaniesController::class, 'unblock']);

        // Users
        Route::get('/users', [UsersController::class, 'index']);
        Route::post('/users', [UsersController::class, 'store']);
        Route::put('/users/{id}', [UsersController::class, 'update']);
        Route::delete('/users/{id}', [UsersController::class, 'destroy']);
        Route::post('/users/{id}/block', [UsersController::class, 'block']);
        Route::post('/users/{id}/unblock', [UsersController::class, 'unblock']);

        // Categories
        Route::get('/categories', [CategoriesController::class, 'index']);
        Route::post('/categories', [CategoriesController::class, 'store']);
        Route::get('/categories/{id}', [CategoriesController::class, 'show']);
        Route::put('/categories/{id}', [CategoriesController::class, 'update']);
        Route::delete('/categories/{id}', [CategoriesController::class, 'destroy']);

        // Reviews
        Route::get('/reviews', [AdminReviewsController::class, 'index']);
        Route::get('/reviews/stats', [AdminReviewsController::class, 'stats']);
        Route::get('/reviews/rating-distribution', [AdminReviewsController::class, 'ratingDistribution']);
        Route::put('/reviews/{id}/response', [AdminReviewsController::class, 'updateResponse']);
        Route::delete('/reviews/{id}', [AdminReviewsController::class, 'destroy']);

        // Activity Log
        Route::get('/activity-log', [ActivityLogController::class, 'index']);
        Route::get('/activity-log/stats', [ActivityLogController::class, 'stats']);
        Route::get('/activity-log/export/csv', [ActivityLogController::class, 'export']);
        Route::get('/activity-log/{id}', [ActivityLogController::class, 'show']);

        // Company Activity (для детальной страницы компании)
        Route::get('/companies/{id}/activity', [ActivityLogController::class, 'companyActivity']);

        // Billing
        Route::get('/billing/overview', [BillingController::class, 'overview']);
        Route::get('/billing/revenue-chart', [BillingController::class, 'revenueChart']);
        Route::get('/billing/ad-spend', [BillingController::class, 'adSpend']);
        Route::get('/billing/campaigns', [BillingController::class, 'campaigns']);
        Route::get('/billing/revenue-by-company', [BillingController::class, 'revenueByCompany']);
        Route::get('/billing/transactions', [BillingController::class, 'transactions']);
        Route::get('/billing/transactions/stripe', [BillingController::class, 'transactionStripe']);
        Route::get('/billing/export', [BillingController::class, 'export']);
        Route::get('/billing/revenue-structure', [BillingController::class, 'revenueStructure']); // Phase 1B
        Route::get('/billing/forecast', [BillingController::class, 'forecast']); // Phase 1B

        // Stripe Connect Billing
        Route::get('/billing/connect/overview', [BillingController::class, 'connectOverview']);
        Route::get('/billing/connect/accounts', [BillingController::class, 'connectAccounts']);
        Route::get('/billing/connect/payments', [BillingController::class, 'connectPayments']);
        Route::get('/billing/connect/payments/{payment}/stripe', [BillingController::class, 'connectPaymentStripe']);
        Route::get('/billing/connect/revenue-chart', [BillingController::class, 'connectRevenueChart']);

        // Business Events
        Route::get('/business-events', [BusinessEventsController::class, 'index']);
        Route::get('/business-events/{id}', [BusinessEventsController::class, 'show']);

        // Health & Alerts
        Route::get('/health/status', [HealthController::class, 'status']);
        Route::get('/health/alerts', [HealthController::class, 'alerts']);
        Route::post('/health/alerts/{id}/resolve', [HealthController::class, 'resolveAlert']);

        // Settings
        Route::get('/settings/general', [AdminSettingsController::class, 'getGeneral']);
        Route::put('/settings/general', [AdminSettingsController::class, 'updateGeneral']);
        Route::get('/settings/integrations', [AdminSettingsController::class, 'getIntegrations']);
        Route::put('/settings/integrations', [AdminSettingsController::class, 'updateIntegrations']);
        Route::get('/settings/subscriptions', [AdminSettingsController::class, 'getSubscriptions']);
        Route::put('/settings/subscriptions', [AdminSettingsController::class, 'updateSubscriptions']);
        Route::get('/settings/system', [AdminSettingsController::class, 'getSystem']);
        Route::put('/settings/system', [AdminSettingsController::class, 'updateSystem']);
        Route::post('/settings/system/clear-cache', [AdminSettingsController::class, 'clearCache']);
        Route::post('/settings/logo', [AdminSettingsController::class, 'uploadLogo']);
        Route::delete('/settings/logo', [AdminSettingsController::class, 'removeLogo']);

        // Полные бэкапы платформы (архив + БД + Docker-образы) → только S3
        Route::get('/backups', [BackupsController::class, 'index']);
        Route::post('/backups', [BackupsController::class, 'store']);
        Route::get('/backups/partner-export', [BackupsController::class, 'partnerExport']);
        Route::get('/backups/{id}/download-url', [BackupsController::class, 'downloadUrl']);
        Route::delete('/backups/{id}', [BackupsController::class, 'destroy']);

        // Additional Services
        Route::prefix('additional-services')->group(function () {
            Route::get('/', [AdditionalServicesController::class, 'index']);
            Route::post('/', [AdditionalServicesController::class, 'store']);
            Route::get('/all', [AdditionalServicesController::class, 'all']);
            Route::get('/{id}', [AdditionalServicesController::class, 'show']);
            Route::put('/{id}', [AdditionalServicesController::class, 'update']);
            Route::delete('/{id}', [AdditionalServicesController::class, 'destroy']);
        });

        // База знаний — управление (суперадмин)
        Route::prefix('knowledge')->group(function () {
            Route::post('/media', [KnowledgeMediaController::class, 'store']);
            Route::get('/topics', [KnowledgeTopicsController::class, 'index']);
            Route::post('/topics', [KnowledgeTopicsController::class, 'store']);
            Route::get('/topics/{id}', [KnowledgeTopicsController::class, 'show'])->where('id', '[0-9]+');
            Route::put('/topics/{id}', [KnowledgeTopicsController::class, 'update'])->where('id', '[0-9]+');
            Route::delete('/topics/{id}', [KnowledgeTopicsController::class, 'destroy'])->where('id', '[0-9]+');

            Route::get('/topics/{topicId}/articles', [KnowledgeArticlesController::class, 'index'])->where('topicId', '[0-9]+');
            Route::post('/topics/{topicId}/articles', [KnowledgeArticlesController::class, 'store'])->where('topicId', '[0-9]+');
            Route::get('/articles/{id}', [KnowledgeArticlesController::class, 'show'])->where('id', '[0-9]+');
            Route::put('/articles/{id}', [KnowledgeArticlesController::class, 'update'])->where('id', '[0-9]+');
            Route::delete('/articles/{id}', [KnowledgeArticlesController::class, 'destroy'])->where('id', '[0-9]+');
        });

        // Subscription Plans — управление планами подписок
        Route::prefix('subscription-plans')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\SubscriptionPlansController::class, 'index']);
            Route::get('/stats', [\App\Http\Controllers\Admin\SubscriptionPlansController::class, 'stats']);
            Route::post('/', [\App\Http\Controllers\Admin\SubscriptionPlansController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\Admin\SubscriptionPlansController::class, 'show'])->where('id', '[0-9]+');
            Route::put('/{id}', [\App\Http\Controllers\Admin\SubscriptionPlansController::class, 'update'])->where('id', '[0-9]+');
            Route::delete('/{id}', [\App\Http\Controllers\Admin\SubscriptionPlansController::class, 'destroy'])->where('id', '[0-9]+');
            Route::post('/{id}/set-default', [\App\Http\Controllers\Admin\SubscriptionPlansController::class, 'setDefault'])->where('id', '[0-9]+');
            Route::post('/reorder', [\App\Http\Controllers\Admin\SubscriptionPlansController::class, 'reorder']);
        });
    });
});

