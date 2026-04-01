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
use App\Http\Controllers\Business\ClientsController;
use App\Http\Controllers\Business\SettingsController;
use App\Http\Controllers\Business\BookingsController as BusinessBookingsController;
use App\Http\Controllers\Business\ReviewsController as BusinessReviewsController;
use App\Http\Controllers\Business\ReportsController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\CompaniesController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Controllers\Admin\AdvertisementsController;
use App\Http\Controllers\Admin\ReviewsController as AdminReviewsController;
use App\Http\Controllers\Admin\CategoriesController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\AdditionalServicesController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\Public\ReviewController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    
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
    Route::get('/available-slots', [BookingController::class, 'getAvailableSlots']);
    Route::post('/check-availability', [BookingController::class, 'checkAvailability']);
});

// Public platform settings (for logo customization)
Route::get('/settings/public', [AdminSettingsController::class, 'getPublicSettings']);

// Public review routes (for unregistered clients)
Route::prefix('public/reviews')->group(function () {
    Route::get('/token/{token}', [ReviewController::class, 'showByToken']);
    Route::post('/token/{token}', [ReviewController::class, 'storeByToken']);
});

// Protected routes
Route::middleware(['jwt.auth'])->group(function () {
    // Auth routes
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Universal user profile routes (for BUSINESS_OWNER and SUPERADMIN only, not CLIENT)
    Route::prefix('user')->middleware(['role:BUSINESS_OWNER,SUPERADMIN'])->group(function () {
        Route::get('/profile', [\App\Http\Controllers\Client\ProfileController::class, 'show']);
        Route::put('/profile', [\App\Http\Controllers\Client\ProfileController::class, 'update']);
        Route::post('/profile/avatar', [\App\Http\Controllers\Client\ProfileController::class, 'uploadAvatar']);
        Route::delete('/profile/avatar', [\App\Http\Controllers\Client\ProfileController::class, 'deleteAvatar']);
        Route::post('/profile/change-password', [\App\Http\Controllers\Client\ProfileController::class, 'changePassword']);
    });

    // Client routes
    Route::prefix('client')->middleware(['role:CLIENT'])->group(function () {
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
        Route::get('/notifications/settings', [NotificationsController::class, 'getSettings']);
        Route::put('/notifications/settings', [NotificationsController::class, 'updateSettings']);
    });

    // Business routes
    Route::prefix('business')->middleware(['role:BUSINESS_OWNER,SUPERADMIN', 'tenant'])->group(function () {
        // Dashboard
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/dashboard/recent-bookings', [DashboardController::class, 'recentBookings']);
        Route::get('/dashboard/chart', [DashboardController::class, 'chart']);

        // Schedule
        Route::get('/schedule/slots', [ScheduleController::class, 'index']);
        Route::post('/schedule/slots', [ScheduleController::class, 'store']);
        Route::put('/schedule/slots/{id}', [ScheduleController::class, 'update']);
        Route::delete('/schedule/slots/{id}', [ScheduleController::class, 'destroy']);

        // Reports
        Route::prefix('reports')->group(function () {
            Route::get('/', [ReportsController::class, 'index']);
            Route::get('/bookings', [ReportsController::class, 'bookings']);
            Route::get('/clients', [ReportsController::class, 'clients']);
            Route::get('/revenue', [ReportsController::class, 'revenue']);
            Route::get('/specialists', [ReportsController::class, 'specialists']);
            Route::get('/export/{type}', [ReportsController::class, 'export']);
        });

        // Clients
        Route::get('/clients', [ClientsController::class, 'index']);
        Route::post('/clients', [ClientsController::class, 'store']);
        Route::get('/clients/{id}', [ClientsController::class, 'show']);
        Route::put('/clients/{id}', [ClientsController::class, 'update']);
        Route::put('/clients/{id}/status', [ClientsController::class, 'updateStatus']);
        Route::post('/clients/{id}/notes', [ClientsController::class, 'addNote']);

        // Bookings
        Route::get('/bookings', [BusinessBookingsController::class, 'index']);
        Route::get('/bookings/{id}', [BusinessBookingsController::class, 'show']);
        Route::post('/bookings', [BusinessBookingsController::class, 'store']);
        Route::put('/bookings/{id}', [BusinessBookingsController::class, 'update']);
        Route::delete('/bookings/{id}', [BusinessBookingsController::class, 'destroy']);

        // Reviews
        Route::get('/reviews', [BusinessReviewsController::class, 'index']);
        Route::put('/reviews/{id}/response', [BusinessReviewsController::class, 'updateResponse']);

        // Settings
        Route::get('/settings/profile', [SettingsController::class, 'getProfile']);
        Route::put('/settings/profile', [SettingsController::class, 'updateProfile']);
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
        Route::delete('/settings/advertisements/{id}', [SettingsController::class, 'deleteAdvertisement']);
        
        // Onboarding
        Route::post('/onboarding/complete', [SettingsController::class, 'completeOnboarding']);
    });

    // Admin routes
    Route::prefix('admin')->middleware(['role:SUPERADMIN'])->group(function () {
        // Advertisements
        Route::get('/advertisements', [AdvertisementsController::class, 'index']);
        Route::post('/advertisements', [AdvertisementsController::class, 'store']);
        Route::post('/advertisements/upload-image', [AdvertisementsController::class, 'uploadImage']);
        Route::get('/advertisements/{id}', [AdvertisementsController::class, 'show']);
        Route::put('/advertisements/{id}', [AdvertisementsController::class, 'update']);
        Route::post('/advertisements/{id}/approve', [AdvertisementsController::class, 'approve']);
        Route::post('/advertisements/{id}/reject', [AdvertisementsController::class, 'reject']);
        // Dashboard
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/dashboard/chart', [AdminDashboardController::class, 'chart']);
        Route::get('/dashboard/recent-activity', [AdminDashboardController::class, 'recentActivity']);

        // Companies
        Route::get('/companies', [CompaniesController::class, 'index']);
        Route::post('/companies', [CompaniesController::class, 'store']);
        Route::get('/companies/{id}', [CompaniesController::class, 'show']);
        Route::get('/companies/{id}/stats', [CompaniesController::class, 'stats']);
        Route::get('/companies/{id}/chart', [CompaniesController::class, 'chart']);
        Route::get('/companies/{id}/team', [CompaniesController::class, 'getTeam']);
        Route::get('/companies/{id}/services', [CompaniesController::class, 'getServices']);
        Route::put('/companies/{id}', [CompaniesController::class, 'update']);
        Route::delete('/companies/{id}', [CompaniesController::class, 'destroy']);
        Route::post('/companies/{id}/approve', [CompaniesController::class, 'approve']);
        Route::post('/companies/{id}/reject', [CompaniesController::class, 'reject']);
        Route::post('/companies/{id}/block', [CompaniesController::class, 'block']);

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
        Route::put('/reviews/{id}/response', [AdminReviewsController::class, 'updateResponse']);
        Route::delete('/reviews/{id}', [AdminReviewsController::class, 'destroy']);

        // Settings
        Route::get('/settings/general', [AdminSettingsController::class, 'getGeneral']);
        Route::put('/settings/general', [AdminSettingsController::class, 'updateGeneral']);
        Route::post('/settings/logo', [AdminSettingsController::class, 'uploadLogo']);
        Route::delete('/settings/logo', [AdminSettingsController::class, 'removeLogo']);

        // Additional Services
        Route::prefix('additional-services')->group(function () {
            Route::get('/', [AdditionalServicesController::class, 'index']);
            Route::post('/', [AdditionalServicesController::class, 'store']);
            Route::get('/all', [AdditionalServicesController::class, 'all']);
            Route::get('/{id}', [AdditionalServicesController::class, 'show']);
            Route::put('/{id}', [AdditionalServicesController::class, 'update']);
            Route::delete('/{id}', [AdditionalServicesController::class, 'destroy']);
        });
    });
});

