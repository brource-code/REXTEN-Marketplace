<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Account;
use Stripe\AccountLink;
use Stripe\Stripe;

class StripeConnectController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Create a Stripe Express account and return onboarding URL.
     */
    public function createAccount(Request $request)
    {
        if (!PlatformSettingsService::isStripePaymentsEnabled()) {
            return response()->json([
                'error' => 'stripe_disabled',
                'message' => 'Stripe payments are disabled on this platform.',
            ], 403);
        }

        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        if ($company->stripe_account_id) {
            return response()->json([
                'error' => 'already_connected',
                'message' => 'Stripe account already connected. Use refresh endpoint to get new onboarding link.',
            ], 400);
        }

        try {
            $account = Account::create([
                'type' => 'express',
                'country' => 'US',
                'email' => $company->email ?? auth('api')->user()->email,
                'capabilities' => [
                    'card_payments' => ['requested' => true],
                    'transfers' => ['requested' => true],
                ],
                'business_type' => 'individual',
                'metadata' => [
                    'company_id' => $company->id,
                    'company_name' => $company->name,
                ],
            ]);

            $company->update([
                'stripe_account_id' => $account->id,
                'stripe_account_status' => 'pending',
                'stripe_payouts_enabled' => false,
                'stripe_charges_enabled' => false,
            ]);

            $accountLink = $this->createAccountLink($account->id, $request);

            Log::info('Stripe Connect account created', [
                'company_id' => $company->id,
                'stripe_account_id' => $account->id,
            ]);

            return response()->json([
                'url' => $accountLink->url,
                'stripe_account_id' => $account->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Stripe Connect account creation failed', [
                'company_id' => $company->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'account_creation_failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Refresh/regenerate the onboarding link (if expired).
     */
    public function refreshAccountLink(Request $request)
    {
        if (!PlatformSettingsService::isStripePaymentsEnabled()) {
            return response()->json([
                'error' => 'stripe_disabled',
                'message' => 'Stripe payments are disabled on this platform.',
            ], 403);
        }

        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        if (!$company->stripe_account_id) {
            return response()->json([
                'error' => 'not_connected',
                'message' => 'No Stripe account connected. Use create endpoint first.',
            ], 400);
        }

        try {
            $accountLink = $this->createAccountLink($company->stripe_account_id, $request);

            return response()->json([
                'url' => $accountLink->url,
            ]);
        } catch (\Exception $e) {
            Log::error('Stripe Connect refresh link failed', [
                'company_id' => $company->id,
                'stripe_account_id' => $company->stripe_account_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'link_creation_failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current Stripe Connect status (always fetches from Stripe API for accuracy).
     */
    public function getAccountStatus(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        if (!$company->stripe_account_id) {
            return response()->json([
                'stripe_account_id' => null,
                'stripe_account_status' => 'none',
                'stripe_payouts_enabled' => false,
                'stripe_charges_enabled' => false,
                'stripe_onboarding_completed_at' => null,
                'stripe_disabled_reason' => null,
                'has_active_dispute' => $company->has_active_dispute ?? false,
                'platform_fee_percent' => config('services.stripe.application_fee_percent', 10),
                'requirements' => null,
            ]);
        }

        try {
            $account = Account::retrieve($company->stripe_account_id);

            $status = $this->determineAccountStatus($account);
            $disabledReason = $account->requirements->disabled_reason ?? null;

            $updateData = [
                'stripe_account_status' => $status,
                'stripe_payouts_enabled' => $account->payouts_enabled ?? false,
                'stripe_charges_enabled' => $account->charges_enabled ?? false,
                'stripe_disabled_reason' => $disabledReason,
            ];

            if ($status === 'active' && !$company->stripe_onboarding_completed_at) {
                $updateData['stripe_onboarding_completed_at'] = now();
            }

            $company->update($updateData);

            return response()->json([
                'stripe_account_id' => $company->stripe_account_id,
                'stripe_account_status' => $status,
                'stripe_payouts_enabled' => $account->payouts_enabled ?? false,
                'stripe_charges_enabled' => $account->charges_enabled ?? false,
                'stripe_onboarding_completed_at' => $company->stripe_onboarding_completed_at,
                'stripe_disabled_reason' => $disabledReason,
                'has_active_dispute' => $company->has_active_dispute ?? false,
                'platform_fee_percent' => config('services.stripe.application_fee_percent', 10),
                'requirements' => [
                    'currently_due' => $account->requirements->currently_due ?? [],
                    'eventually_due' => $account->requirements->eventually_due ?? [],
                    'past_due' => $account->requirements->past_due ?? [],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Stripe Connect status fetch failed', [
                'company_id' => $company->id,
                'stripe_account_id' => $company->stripe_account_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'stripe_account_id' => $company->stripe_account_id,
                'stripe_account_status' => $company->stripe_account_status,
                'stripe_payouts_enabled' => $company->stripe_payouts_enabled,
                'stripe_charges_enabled' => $company->stripe_charges_enabled,
                'stripe_onboarding_completed_at' => $company->stripe_onboarding_completed_at,
                'stripe_disabled_reason' => $company->stripe_disabled_reason,
                'has_active_dispute' => $company->has_active_dispute ?? false,
                'requirements' => null,
                'error' => 'Could not fetch live status from Stripe',
            ]);
        }
    }

    /**
     * Get Stripe Express Dashboard login link.
     */
    public function getDashboardLink(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        if (!$company->stripe_account_id) {
            return response()->json([
                'error' => 'not_connected',
                'message' => 'No Stripe account connected.',
            ], 400);
        }

        try {
            $loginLink = Account::createLoginLink($company->stripe_account_id);

            return response()->json([
                'url' => $loginLink->url,
            ]);
        } catch (\Exception $e) {
            Log::error('Stripe Connect dashboard link failed', [
                'company_id' => $company->id,
                'stripe_account_id' => $company->stripe_account_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'link_creation_failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Disconnect Stripe account (does NOT delete account in Stripe).
     */
    public function disconnect(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        if (!$company->stripe_account_id) {
            return response()->json([
                'error' => 'not_connected',
                'message' => 'No Stripe account connected.',
            ], 400);
        }

        $oldAccountId = $company->stripe_account_id;

        $company->update([
            'stripe_account_id' => null,
            'stripe_account_status' => 'none',
            'stripe_payouts_enabled' => false,
            'stripe_charges_enabled' => false,
            'stripe_onboarding_completed_at' => null,
            'stripe_disabled_reason' => null,
        ]);

        Log::info('Stripe Connect account disconnected', [
            'company_id' => $company->id,
            'old_stripe_account_id' => $oldAccountId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Stripe account disconnected successfully.',
        ]);
    }

    /**
     * Get company from request (set by TenantMiddleware).
     */
    private function getCompany(Request $request): ?Company
    {
        $companyId = $request->input('current_company_id');
        if ($companyId) {
            return Company::find($companyId);
        }

        $user = auth('api')->user();
        if ($user && $user->isBusinessOwner()) {
            return $user->ownedCompanies()->first();
        }

        return null;
    }

    /**
     * Create AccountLink for onboarding.
     */
    private function createAccountLink(string $accountId, Request $request): AccountLink
    {
        $frontendUrl = $this->getFrontendUrl();

        return AccountLink::create([
            'account' => $accountId,
            'refresh_url' => $frontendUrl . '/business/settings?tab=payments&stripe_refresh=true',
            'return_url' => $frontendUrl . '/business/settings/stripe/callback',
            'type' => 'account_onboarding',
        ]);
    }

    /**
     * Determine account status based on Stripe account data.
     */
    private function determineAccountStatus(Account $account): string
    {
        if ($account->requirements->disabled_reason) {
            return 'disabled';
        }

        if (!empty($account->requirements->currently_due) && !$account->charges_enabled) {
            return 'restricted';
        }

        if ($account->charges_enabled && $account->payouts_enabled) {
            return 'active';
        }

        if ($account->charges_enabled || $account->payouts_enabled) {
            return 'restricted';
        }

        return 'pending';
    }

    /**
     * Get frontend URL from config.
     */
    private function getFrontendUrl(): string
    {
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3003'));
        return rtrim($frontendUrl, '/');
    }
}
