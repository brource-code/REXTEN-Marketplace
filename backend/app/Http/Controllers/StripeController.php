<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Stripe\Stripe;
use Stripe\Checkout\Session;
use Stripe\Exception\SignatureVerificationException;
use App\Models\Advertisement;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\PlatformSettingsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StripeController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Создать Checkout Session для покупки рекламы
     */
    public function createCheckoutSession(Request $request)
    {
        if (! PlatformSettingsService::isStripePaymentsEnabled()) {
            return response()->json([
                'error' => 'stripe_disabled',
                'message' => 'Оплата через Stripe отключена в настройках платформы.',
            ], 403);
        }

        $validated = $request->validate([
            'advertisement_id' => 'required|exists:advertisements,id',
            'package_id' => 'required|in:basic,standard,premium',
        ]);

        $user = auth('api')->user();
        
        // Получаем company_id из request (устанавливается в TenantMiddleware)
        // или из первой компании владельца
        $companyId = $request->input('current_company_id');
        
        if (!$companyId && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company ? $company->id : null;
        }

        // Для суперадмина разрешаем доступ ко всем объявлениям
        if ($user->isSuperAdmin()) {
            $advertisement = Advertisement::findOrFail($validated['advertisement_id']);
        } else {
            // Для владельцев бизнеса проверяем принадлежность объявления
            if (!$companyId) {
                return response()->json([
                    'error' => 'Company not found',
                    'message' => 'Бизнес не найден',
                ], 404);
            }
            
            $advertisement = Advertisement::where('id', $validated['advertisement_id'])
                ->where('company_id', $companyId)
                ->first();
            
            if (!$advertisement) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Это объявление не принадлежит вашему бизнесу',
                ], 403);
            }
        }
        
        // Цены пакетов (в центах для Stripe)
        $packages = [
            'basic' => ['price' => 4900, 'duration' => 7, 'name' => 'Basic'],
            'standard' => ['price' => 8900, 'duration' => 14, 'name' => 'Standard'],
            'premium' => ['price' => 14900, 'duration' => 30, 'name' => 'Premium'],
        ];

        $package = $packages[$validated['package_id']];

        // Получаем URL фронтенда
        $frontendUrl = $this->getFrontendUrl($request);

        try {
            $session = Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => 'usd',
                        'product_data' => [
                            'name' => "Реклама: {$package['name']} ({$package['duration']} дней)",
                            'description' => "Рекламное размещение для: {$advertisement->title}",
                        ],
                        'unit_amount' => $package['price'],
                    ],
                    'quantity' => 1,
                ]],
                'mode' => 'payment',
                'success_url' => $frontendUrl . '/business/advertisements/purchase?payment=success&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $frontendUrl . '/business/advertisements/purchase?payment=cancelled',
                'metadata' => [
                    'advertisement_id' => $advertisement->id,
                    'package_id' => $validated['package_id'],
                    'duration' => $package['duration'],
                    'user_id' => $user->id,
                    'company_id' => $companyId,
                ],
            ]);

            Log::info('Stripe Checkout Session created', [
                'session_id' => $session->id,
                'advertisement_id' => $advertisement->id,
                'package_id' => $validated['package_id'],
            ]);

            return response()->json([
                'checkout_url' => $session->url,
                'session_id' => $session->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Stripe Checkout Session creation failed', [
                'error' => $e->getMessage(),
                'advertisement_id' => $advertisement->id,
            ]);

            return response()->json([
                'error' => 'Payment session creation failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Webhook для обработки событий от Stripe
     */
    public function handleWebhook(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $webhookSecret = config('services.stripe.webhook_secret');

        if (!$webhookSecret) {
            Log::warning('Stripe webhook secret not configured');
            return response()->json(['error' => 'Webhook secret not configured'], 500);
        }

        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload, $sigHeader, $webhookSecret
            );
        } catch (\UnexpectedValueException $e) {
            Log::error('Stripe webhook: Invalid payload', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid payload'], 400);
        } catch (SignatureVerificationException $e) {
            Log::error('Stripe webhook: Invalid signature', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        // Обрабатываем успешную оплату
        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            $metadata = $session->metadata;

            $type = $metadata->type ?? null;

            if ($type === 'subscription') {
                $this->handleSubscriptionPayment($session, $metadata);
            } else {
                $this->handleAdvertisementPayment($session, $metadata);
            }
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * Получить транзакции бизнеса из Stripe
     */
    public function getTransactions(Request $request)
    {
        if (! PlatformSettingsService::isStripePaymentsEnabled()) {
            return response()->json([
                'error' => 'stripe_disabled',
                'message' => 'Оплата через Stripe отключена в настройках платформы.',
                'transactions' => [],
                'has_more' => false,
                'next_cursor' => null,
            ], 403);
        }

        $user = auth('api')->user();
        
        // Получаем company_id из request (устанавливается в TenantMiddleware)
        // или из первой компании владельца
        $companyId = $request->input('current_company_id');
        
        if (!$companyId && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company ? $company->id : null;
        }

        if (!$companyId && !$user->isSuperAdmin()) {
            return response()->json([
                'error' => 'Company not found',
                'message' => 'Бизнес не найден',
            ], 404);
        }

        try {
            // Получаем все платежи (charges) из Stripe
            // Для бизнеса фильтруем по metadata с company_id или user_id
            $params = [
                'limit' => $request->input('limit', 100),
            ];

            // Если есть курсор для пагинации
            if ($request->has('starting_after')) {
                $params['starting_after'] = $request->input('starting_after');
            }

            // Получаем Checkout Sessions напрямую - это более надежный способ
            // так как metadata хранится именно в Session
            $sessions = Session::all([
                'limit' => $request->input('limit', 100),
                'expand' => ['data.payment_intent'],
            ]);

            $transactions = [];
            
            foreach ($sessions->data as $session) {
                // Пропускаем неоплаченные сессии
                if ($session->payment_status !== 'paid') {
                    continue;
                }

                // Получаем metadata из сессии
                $metadata = $session->metadata;
                
                // Определяем тип транзакции
                $transactionType = 'unknown';
                $description = 'Payment';
                $shouldInclude = false;
                
                // Проверяем, есть ли advertisement_id в metadata
                if (isset($metadata->advertisement_id)) {
                    $transactionType = 'advertisement';
                    $advertisementId = $metadata->advertisement_id;
                    $packageId = $metadata->package_id ?? 'unknown';
                    $sessionCompanyId = $metadata->company_id ?? null;
                    
                    // Проверяем принадлежность по company_id из metadata
                    if ($user->isSuperAdmin()) {
                        $shouldInclude = true;
                    } elseif ($sessionCompanyId && $sessionCompanyId == $companyId) {
                        $shouldInclude = true;
                    } elseif (isset($metadata->user_id) && $metadata->user_id == $user->id) {
                        $shouldInclude = true;
                    }
                    
                    if ($shouldInclude) {
                        // Получаем информацию об объявлении для описания
                        $advertisement = Advertisement::find($advertisementId);
                        if ($advertisement) {
                            $description = "Реклама: {$advertisement->title} ({$packageId})";
                        } else {
                            $description = "Реклама: Advertisement #{$advertisementId} ({$packageId})";
                        }
                    }
                } elseif (
                    isset($metadata->subscription_id)
                    || (isset($metadata->type) && (string) $metadata->type === 'subscription')
                    || (isset($metadata->plan) && ! isset($metadata->advertisement_id))
                ) {
                    $transactionType = 'subscription';
                    $planSlug = isset($metadata->plan) ? (string) $metadata->plan : '';
                    $planModel = $planSlug !== '' ? SubscriptionPlan::findBySlug($planSlug) : null;
                    $description = $planModel
                        ? 'Subscription: '.$planModel->name
                        : ($planSlug !== '' ? 'Subscription: '.$planSlug : 'Subscription payment');

                    // Проверяем принадлежность
                    if ($user->isSuperAdmin()) {
                        $shouldInclude = true;
                    } elseif (isset($metadata->user_id) && (int) $metadata->user_id === (int) $user->id) {
                        $shouldInclude = true;
                    } elseif (isset($metadata->company_id) && (int) $metadata->company_id === (int) $companyId) {
                        $shouldInclude = true;
                    }
                } else {
                    // Для неизвестных типов - только суперадмин видит все
                    if ($user->isSuperAdmin()) {
                        $shouldInclude = true;
                    } elseif (isset($metadata->user_id) && $metadata->user_id == $user->id) {
                        $shouldInclude = true;
                    } elseif (isset($metadata->company_id) && $metadata->company_id == $companyId) {
                        $shouldInclude = true;
                    }
                }

                if (!$shouldInclude) {
                    continue;
                }

                // Получаем сумму из payment_intent или amount_total
                $amount = $session->amount_total ? $session->amount_total / 100 : 0;
                $currency = strtoupper($session->currency ?? 'USD');
                
                // Определяем статус
                $status = 'succeeded';
                if ($session->payment_status === 'unpaid') {
                    $status = 'pending';
                }

                $planMeta = isset($metadata->plan) ? (string) $metadata->plan : null;
                $intervalMeta = isset($metadata->interval) ? (string) $metadata->interval : null;

                $transactions[] = [
                    'id' => $session->id,
                    'type' => $transactionType,
                    'amount' => $amount,
                    'currency' => $currency,
                    'status' => $status,
                    'description' => $description,
                    'plan' => $planMeta,
                    'interval' => $intervalMeta,
                    'created' => date('Y-m-d H:i:s', $session->created),
                    'created_timestamp' => $session->created,
                    'metadata' => [
                        'advertisement_id' => $metadata->advertisement_id ?? null,
                        'package_id' => $metadata->package_id ?? null,
                        'subscription_id' => $metadata->subscription_id ?? null,
                        'type' => $metadata->type ?? null,
                        'plan' => $planMeta,
                        'interval' => $intervalMeta,
                    ],
                ];
            }

            // Получаем последний ID для пагинации
            $lastId = null;
            if (count($transactions) > 0) {
                $lastId = $transactions[count($transactions) - 1]['id'];
            }

            return response()->json([
                'transactions' => $transactions,
                'has_more' => $sessions->has_more,
                'next_cursor' => $lastId,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch Stripe transactions', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'company_id' => $companyId,
            ]);

            return response()->json([
                'error' => 'Failed to fetch transactions',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function handleSubscriptionPayment($session, $metadata): void
    {
        $companyId = $metadata->company_id ?? null;
        $plan = $metadata->plan ?? null;
        $interval = $metadata->interval ?? 'month';
        $priceCents = (int) ($metadata->price_cents ?? 0);

        if (!$companyId || !$plan) {
            Log::error('Stripe webhook subscription: missing metadata', [
                'session_id' => $session->id,
            ]);
            return;
        }

        $periodEnd = $interval === 'year' ? now()->addYear() : now()->addMonth();

        $planModel = SubscriptionPlan::findBySlug((string) $plan);

        DB::transaction(function () use ($companyId, $plan, $session, $priceCents, $interval, $periodEnd, $planModel) {
            Subscription::where('company_id', $companyId)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->update(['status' => Subscription::STATUS_CANCELED]);

            Subscription::create([
                'company_id' => $companyId,
                'plan' => $plan,
                'status' => Subscription::STATUS_ACTIVE,
                'stripe_session_id' => $session->id,
                'price_cents' => $priceCents,
                'currency' => $planModel?->currency ?? 'usd',
                'interval' => $interval,
                'current_period_start' => now(),
                'current_period_end' => $periodEnd,
                'grace_period_ends_at' => null,
                'scheduled_plan' => null,
                'previous_plan' => null,
            ]);
        });

        Log::info('Subscription activated via webhook', [
            'company_id' => $companyId,
            'plan' => $plan,
            'session_id' => $session->id,
        ]);
    }

    private function handleAdvertisementPayment($session, $metadata): void
    {
        $advertisementId = $metadata->advertisement_id ?? null;
        $duration = isset($metadata->duration) ? (int) $metadata->duration : null;

        if (!$advertisementId || !$duration) {
            Log::error('Stripe webhook: Missing metadata', [
                'session_id' => $session->id,
                'metadata' => $metadata,
            ]);
            return;
        }

        $advertisement = Advertisement::find($advertisementId);
        if (!$advertisement) {
            Log::error('Stripe webhook: Advertisement not found', [
                'advertisement_id' => $advertisementId,
            ]);
            return;
        }

        $startDate = now();
        $endDate = now()->addDays($duration);

        $advertisement->update([
            'type' => 'advertisement',
            'placement' => 'services',
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $endDate->format('Y-m-d'),
            'status' => 'approved',
            'is_active' => true,
        ]);

        Log::info('Advertisement activated via payment', [
            'advertisement_id' => $advertisementId,
            'session_id' => $session->id,
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $endDate->format('Y-m-d'),
        ]);
    }

    /**
     * Получить URL фронтенда из конфига или переменной окружения
     */
    private function getFrontendUrl(Request $request)
    {
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3003'));
        return rtrim($frontendUrl, '/');
    }
}
