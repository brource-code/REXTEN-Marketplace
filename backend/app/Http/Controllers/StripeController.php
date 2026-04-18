<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Stripe\Stripe;
use Stripe\Charge;
use Stripe\Checkout\Session;
use Stripe\Customer as StripeCustomer;
use Stripe\PaymentIntent;
use Stripe\Refund;
use Stripe\Exception\SignatureVerificationException;
use App\Models\Advertisement;
use App\Models\Booking;
use App\Models\Company;
use App\Models\Payment;
use App\Models\StripeWebhookEvent;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Services\PlatformSettingsService;
use App\Services\StripeSubscriptionService;
use App\Services\SubscriptionLifecycleService;
use App\Services\SubscriptionMailer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Invoice as StripeInvoice;
use Stripe\Subscription as StripeSubscription;

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
                'automatic_payment_methods' => ['enabled' => true],
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
     * Webhook для обработки событий от Stripe (platform events).
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

        // Для Connect событий передаём account ID (если есть)
        $stripeAccountId = $event->account ?? null;
        
        return $this->processWebhookEvent($event, $stripeAccountId);
    }

    /**
     * Process a webhook event with deduplication.
     */
    private function processWebhookEvent($event, ?string $stripeAccountId = null)
    {
        $eventId = $event->id;
        $eventType = $event->type;

        if (StripeWebhookEvent::wasProcessed($eventId)) {
            Log::info('Stripe webhook: duplicate event skipped', ['event_id' => $eventId, 'type' => $eventType]);
            return response()->json(['status' => 'skipped', 'reason' => 'duplicate']);
        }

        try {
            $this->handleStripeEvent($event, $stripeAccountId);

            StripeWebhookEvent::recordProcessed($eventId, $eventType, $stripeAccountId, json_decode(json_encode($event), true));

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            Log::error('Stripe webhook processing failed', [
                'event_id' => $eventId,
                'type' => $eventType,
                'error' => $e->getMessage(),
            ]);

            StripeWebhookEvent::recordFailed($eventId, $eventType, $e->getMessage(), $stripeAccountId, json_decode(json_encode($event), true));

            return response()->json(['error' => 'Processing failed'], 500);
        }
    }

    /**
     * Handle individual Stripe events.
     */
    private function handleStripeEvent($event, ?string $stripeAccountId = null): void
    {
        $eventType = $event->type;
        $object = $event->data->object;

        switch ($eventType) {
            case 'checkout.session.completed':
                $metadata = $object->metadata;
                $type = $metadata->type ?? null;
                if ($type === 'subscription') {
                    $this->handleSubscriptionPayment($object, $metadata);
                } else {
                    $this->handleAdvertisementPayment($object, $metadata);
                }
                break;

            case 'payment_intent.amount_capturable_updated':
                $this->handlePaymentIntentAuthorized($object);
                break;

            case 'payment_intent.succeeded':
                $this->handlePaymentIntentSucceeded($object);
                break;

            case 'payment_intent.payment_failed':
                $this->handlePaymentIntentFailed($object);
                break;

            case 'payment_intent.canceled':
                $this->handlePaymentIntentCanceled($object);
                break;

            case 'payment_intent.processing':
                Log::info('Stripe webhook: payment_intent.processing', [
                    'pi_id' => $object->id ?? null,
                ]);
                break;

            case 'charge.refunded':
                $this->handleChargeRefunded($object);
                break;

            case 'charge.dispute.created':
                $this->handleDisputeCreated($object);
                break;

            case 'charge.dispute.closed':
                $this->handleDisputeClosed($object);
                break;

            case 'transfer.reversed':
                $this->handleTransferReversed($object);
                break;

            case 'account.updated':
                $this->handleAccountUpdated($object, $stripeAccountId);
                break;

            case 'customer.subscription.updated':
                $this->handleSubscriptionUpdated($object);
                break;

            case 'customer.subscription.deleted':
                $this->handleSubscriptionDeleted($object);
                break;

            case 'invoice.payment_succeeded':
            case 'invoice.paid':
                $this->handleInvoicePaymentSucceeded($object);
                break;

            case 'invoice.payment_failed':
                $this->handleInvoicePaymentFailed($object);
                break;

            default:
                Log::debug('Stripe webhook: unhandled event type', ['type' => $eventType]);
        }
    }

    /**
     * Stripe прислал обновление подписки: смена статуса, cancel_at_period_end, период.
     * Зеркалируем локально через StripeSubscriptionService::syncFromStripe.
     */
    private function handleSubscriptionUpdated($stripeSub): void
    {
        $local = Subscription::where('stripe_subscription_id', $stripeSub->id)->first();
        if (!$local) {
            Log::info('Webhook customer.subscription.updated: no local record (skipping)', [
                'stripe_subscription_id' => $stripeSub->id,
            ]);
            return;
        }

        StripeSubscriptionService::syncFromStripe($local, $stripeSub);
    }

    /**
     * Stripe удалил подписку (период завершён после cancel_at_period_end или dunning failed).
     * Локально: помечаем canceled и переводим компанию на free с grace-периодом.
     * Если был запланирован downgrade — он делается отдельно через cron (applyScheduledDowngradeViaStripe)
     * до того, как Stripe удалит подписку. Если cron не успел — пользователь окажется на free,
     * это безопасно (доступ восстанавливается checkout'ом previous_plan).
     */
    private function handleSubscriptionDeleted($stripeSub): void
    {
        $local = Subscription::where('stripe_subscription_id', $stripeSub->id)->first();
        if (!$local) {
            Log::info('Webhook customer.subscription.deleted: no local record (skipping)', [
                'stripe_subscription_id' => $stripeSub->id,
            ]);
            return;
        }

        if ($local->status !== Subscription::STATUS_ACTIVE) {
            Log::info('Webhook customer.subscription.deleted: local already not active (skipping)', [
                'local_id' => $local->id,
                'status' => $local->status,
            ]);
            return;
        }

        SubscriptionLifecycleService::transitionToFree($local);
    }

    /**
     * Stripe выставил инвойс и оплатил его (продление периода или первая оплата).
     * Обновляем current_period_end локальной записи.
     */
    private function handleInvoicePaymentSucceeded($invoice): void
    {
        $stripeSubId = $invoice->subscription ?? null;
        if (!$stripeSubId) {
            return;
        }

        $local = Subscription::where('stripe_subscription_id', $stripeSubId)->first();
        if (!$local) {
            Log::info('Webhook invoice.payment_succeeded: no local subscription (skipping)', [
                'stripe_subscription_id' => $stripeSubId,
                'invoice_id' => $invoice->id ?? null,
            ]);
            return;
        }

        try {
            StripeSubscriptionService::init();
            $stripeSub = StripeSubscription::retrieve($stripeSubId);
            StripeSubscriptionService::syncFromStripe($local, $stripeSub);
        } catch (\Exception $e) {
            Log::error('Failed to sync subscription on invoice.payment_succeeded', [
                'stripe_subscription_id' => $stripeSubId,
                'error' => $e->getMessage(),
            ]);
        }

        // Письмо владельцу: первая оплата / продление / смена плана с прорацией.
        // Все три кейса покрываются одним хендлером, текст письма выбирается
        // по billing_reason.
        try {
            SubscriptionMailer::notifyPaymentSucceeded($local->fresh() ?? $local, $invoice);
        } catch (\Throwable $e) {
            Log::error('SubscriptionMailer notifyPaymentSucceeded failed', [
                'subscription_id' => $local->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Stripe не смог снять оплату — переводим в past_due (доступ временно сохраняется,
     * Stripe сам делает retries; если все неудачны — пришлёт subscription.deleted).
     */
    private function handleInvoicePaymentFailed($invoice): void
    {
        $stripeSubId = $invoice->subscription ?? null;
        if (!$stripeSubId) {
            return;
        }

        $local = Subscription::where('stripe_subscription_id', $stripeSubId)->first();
        if (!$local) {
            return;
        }

        $local->forceFill(['status' => Subscription::STATUS_PAST_DUE])->save();

        Log::warning('Subscription marked past_due via webhook', [
            'local_id' => $local->id,
            'stripe_subscription_id' => $stripeSubId,
        ]);
    }

    private function handlePaymentIntentAuthorized($paymentIntent): void
    {
        $payment = Payment::where('stripe_payment_intent_id', $paymentIntent->id)->first();
        if (!$payment) {
            Log::warning('Stripe webhook: payment_intent.amount_capturable_updated — no Payment row for PI (skipping)', [
                'pi_id' => $paymentIntent->id ?? null,
                'metadata_booking_id' => $paymentIntent->metadata->booking_id ?? null,
            ]);

            return;
        }

        $booking = $payment->booking_id ? Booking::find($payment->booking_id) : null;
        if ($booking && ($booking->status === 'cancelled' || $booking->payment_status === 'expired')) {
            $this->voidPaymentIntentForStaleBooking($paymentIntent->id, $payment, 'authorized_webhook_race');

            return;
        }

        if ($payment->status !== Payment::STATUS_PENDING) {
            Log::info('Stripe webhook: amount_capturable_updated skipped (payment not pending)', [
                'payment_id' => $payment->id,
                'pi_id' => $paymentIntent->id,
                'payment_status' => $payment->status,
            ]);

            return;
        }

        $payment->update(['status' => Payment::STATUS_AUTHORIZED]);

        if ($payment->booking_id) {
            Booking::where('id', $payment->booking_id)->update([
                'payment_status' => 'authorized',
            ]);

            $booking = Booking::with(['company', 'service', 'user.profile'])->find($payment->booking_id);
            if ($booking) {
                $bookingService = app(\App\Services\BookingService::class);
                $bookingService->notifyOwnerAboutPayment($booking);
                if ($booking->user_id) {
                    $bookingService->notifyClientAboutAuthorizedPayment($booking);
                }
            }
        }

        Log::info('Payment authorized via webhook', ['payment_id' => $payment->id, 'pi_id' => $paymentIntent->id]);
    }

    private function handlePaymentIntentSucceeded($paymentIntent): void
    {
        $payment = Payment::where('stripe_payment_intent_id', $paymentIntent->id)->first();
        if (!$payment) {
            Log::warning('Stripe webhook: payment_intent.succeeded — no Payment row for PI (skipping)', [
                'pi_id' => $paymentIntent->id ?? null,
                'metadata_booking_id' => $paymentIntent->metadata->booking_id ?? null,
            ]);

            return;
        }

        if ($payment->status === Payment::STATUS_SUCCEEDED) {
            return;
        }

        $booking = $payment->booking_id ? Booking::find($payment->booking_id) : null;
        if ($booking && ($booking->status === 'cancelled' || $booking->payment_status === 'expired')) {
            $this->refundPaymentIntentForStaleBooking($paymentIntent->id, $payment, $booking);

            return;
        }

        $payment->update([
            'status' => Payment::STATUS_SUCCEEDED,
            'capture_status' => Payment::CAPTURE_CAPTURED,
            'captured_at' => now(),
            'stripe_charge_id' => $paymentIntent->latest_charge ?? null,
        ]);

        if ($payment->booking_id) {
            Booking::where('id', $payment->booking_id)->update(['payment_status' => 'paid']);
        }

        Log::info('Payment succeeded via webhook', ['payment_id' => $payment->id, 'pi_id' => $paymentIntent->id]);
    }

    private function handlePaymentIntentFailed($paymentIntent): void
    {
        $payment = Payment::where('stripe_payment_intent_id', $paymentIntent->id)->first();
        if (!$payment) {
            Log::warning('Stripe webhook: payment_intent.payment_failed — no Payment row for PI (skipping)', [
                'pi_id' => $paymentIntent->id ?? null,
            ]);

            return;
        }

        if ($payment->status === Payment::STATUS_FAILED) {
            return;
        }

        $payment->update(['status' => Payment::STATUS_FAILED]);

        Log::info('Payment failed via webhook', ['payment_id' => $payment->id, 'pi_id' => $paymentIntent->id]);
    }

    private function handlePaymentIntentCanceled($paymentIntent): void
    {
        $payment = Payment::where('stripe_payment_intent_id', $paymentIntent->id)->first();
        if (!$payment) {
            Log::warning('Stripe webhook: payment_intent.canceled — no Payment row for PI (skipping)', [
                'pi_id' => $paymentIntent->id ?? null,
            ]);

            return;
        }

        if (in_array($payment->capture_status, [Payment::CAPTURE_EXPIRED, Payment::CAPTURE_CANCELLED])) {
            return;
        }

        $payment->update([
            'status' => Payment::STATUS_EXPIRED,
            'capture_status' => Payment::CAPTURE_CANCELLED,
        ]);

        if ($payment->booking_id) {
            Booking::where('id', $payment->booking_id)->update([
                'payment_status' => 'expired',
                'status' => 'cancelled',
            ]);
        }

        Log::info('Payment canceled via webhook', ['payment_id' => $payment->id, 'pi_id' => $paymentIntent->id]);
    }

    private function handleChargeRefunded($charge): void
    {
        $payment = Payment::where('stripe_charge_id', $charge->id)->first();
        if (!$payment) {
            $payment = Payment::where('stripe_payment_intent_id', $charge->payment_intent)->first();
        }
        if (!$payment) {
            return;
        }

        $refundedAmount = $charge->amount_refunded ?? 0;
        $isFullRefund = $refundedAmount >= $payment->amount;

        if ($isFullRefund && $payment->status === Payment::STATUS_REFUNDED) {
            return;
        }

        $payment->update([
            'status' => $isFullRefund ? Payment::STATUS_REFUNDED : Payment::STATUS_PARTIALLY_REFUNDED,
            'refunded_amount' => $refundedAmount,
        ]);

        if ($isFullRefund && $payment->booking_id) {
            Booking::where('id', $payment->booking_id)->update(['payment_status' => 'refunded']);
        }

        Log::info('Payment refunded via webhook', [
            'payment_id' => $payment->id,
            'charge_id' => $charge->id,
            'refunded_amount' => $refundedAmount,
            'is_full' => $isFullRefund,
        ]);
    }

    private function handleDisputeCreated($dispute): void
    {
        $chargeId = $dispute->charge ?? null;
        $paymentIntentId = $dispute->payment_intent ?? null;

        $payment = null;
        if ($chargeId) {
            $payment = Payment::where('stripe_charge_id', $chargeId)->first();
        }
        if (!$payment && $paymentIntentId) {
            $payment = Payment::where('stripe_payment_intent_id', $paymentIntentId)->first();
        }

        if (!$payment) {
            Log::warning('Dispute created but no matching payment found', [
                'dispute_id' => $dispute->id,
                'charge_id' => $chargeId,
            ]);
            return;
        }

        $payment->update([
            'status' => Payment::STATUS_DISPUTED,
            'disputed_at' => now(),
        ]);

        if ($payment->booking_id) {
            Booking::where('id', $payment->booking_id)->update(['payment_status' => 'disputed']);
        }

        if ($payment->company_id) {
            Company::where('id', $payment->company_id)->update(['has_active_dispute' => true]);
        }

        Log::warning('Dispute created', [
            'payment_id' => $payment->id,
            'dispute_id' => $dispute->id,
            'reason' => $dispute->reason ?? 'unknown',
        ]);
    }

    private function handleDisputeClosed($dispute): void
    {
        $chargeId = $dispute->charge ?? null;
        $paymentIntentId = $dispute->payment_intent ?? null;

        $payment = null;
        if ($chargeId) {
            $payment = Payment::where('stripe_charge_id', $chargeId)->first();
        }
        if (!$payment && $paymentIntentId) {
            $payment = Payment::where('stripe_payment_intent_id', $paymentIntentId)->first();
        }

        if (!$payment) {
            return;
        }

        $status = $dispute->status;
        $won = in_array($status, ['won', 'warning_closed']);

        if ($won) {
            $payment->update([
                'status' => Payment::STATUS_SUCCEEDED,
                'disputed_at' => null,
            ]);

            if ($payment->booking_id) {
                Booking::where('id', $payment->booking_id)->update(['payment_status' => 'paid']);
            }
        }

        if ($payment->company_id) {
            $hasOtherDisputes = Payment::where('company_id', $payment->company_id)
                ->where('id', '!=', $payment->id)
                ->where('status', Payment::STATUS_DISPUTED)
                ->exists();

            if (!$hasOtherDisputes) {
                Company::where('id', $payment->company_id)->update(['has_active_dispute' => false]);
            }
        }

        Log::info('Dispute closed', [
            'payment_id' => $payment->id,
            'dispute_id' => $dispute->id,
            'status' => $status,
            'won' => $won,
        ]);
    }

    private function handleTransferReversed($transfer): void
    {
        $payment = Payment::where('stripe_transfer_id', $transfer->id)->first();
        if (!$payment) {
            $destinationPayment = $transfer->destination_payment ?? null;
            if ($destinationPayment) {
                $payment = Payment::where('stripe_charge_id', $destinationPayment)->first();
            }
        }

        if (!$payment) {
            Log::warning('Transfer reversed but no matching payment found', ['transfer_id' => $transfer->id]);
            return;
        }

        $payment->update(['status' => Payment::STATUS_TRANSFER_FAILED]);

        if ($payment->booking_id) {
            Booking::where('id', $payment->booking_id)->update(['payment_status' => 'transfer_reversed']);
        }

        Log::warning('Transfer reversed', [
            'payment_id' => $payment->id,
            'transfer_id' => $transfer->id,
            'amount' => $transfer->amount ?? null,
        ]);
    }

    private function handleAccountUpdated($account, ?string $stripeAccountId = null): void
    {
        $accountId = $stripeAccountId ?? $account->id ?? null;
        if (!$accountId) {
            return;
        }

        $company = Company::where('stripe_account_id', $accountId)->first();
        if (!$company) {
            return;
        }

        $status = 'pending';
        $disabledReason = $account->requirements->disabled_reason ?? null;

        if ($disabledReason) {
            $status = 'disabled';
        } elseif (!empty($account->requirements->currently_due) && !$account->charges_enabled) {
            $status = 'restricted';
        } elseif ($account->charges_enabled && $account->payouts_enabled) {
            $status = 'active';
        } elseif ($account->charges_enabled || $account->payouts_enabled) {
            $status = 'restricted';
        }

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

        Log::info('Stripe account updated via webhook', [
            'company_id' => $company->id,
            'stripe_account_id' => $accountId,
            'status' => $status,
        ]);
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
                'expand' => ['data.payment_intent.latest_charge'],
            ]);

            $transactions = [];
            $seenPaymentIntentIds = [];
            $seenChargeIds = [];

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

                if ($session->payment_intent) {
                    $piObj = $session->payment_intent;
                    $pi = is_string($piObj)
                        ? $piObj
                        : ($piObj->id ?? null);
                    if ($pi) {
                        $seenPaymentIntentIds[$pi] = true;
                    }
                    if (! is_string($piObj) && ! empty($piObj->latest_charge)) {
                        $lc = is_string($piObj->latest_charge)
                            ? $piObj->latest_charge
                            : ($piObj->latest_charge->id ?? null);
                        if ($lc) {
                            $seenChargeIds[$lc] = true;
                        }
                    }
                }
            }

            // Инвойсы подписки (прорация при смене плана и т.п.) идут как Charge без Checkout Session.
            $company = Company::query()->with('owner')->find($companyId);
            $stripeCustomerId = $company?->owner?->stripe_customer_id;

            if ($stripeCustomerId) {
                $chargeLimit = min(100, (int) $request->input('limit', 100));
                $charges = Charge::all([
                    'customer' => $stripeCustomerId,
                    'limit' => $chargeLimit,
                    'expand' => ['data.refunds'],
                ]);

                foreach ($charges->data as $charge) {
                    $piId = null;
                    if (! empty($charge->payment_intent)) {
                        $piId = is_string($charge->payment_intent)
                            ? $charge->payment_intent
                            : ($charge->payment_intent->id ?? null);
                    }

                    $md = $charge->metadata ?? (object) [];
                    $skipChargeRow = ($piId && isset($seenPaymentIntentIds[$piId]))
                        || isset($seenChargeIds[$charge->id ?? '']);

                    $baseDescription = '';
                    $transactionType = 'unknown';
                    $planMeta = isset($md->plan) ? (string) $md->plan : null;
                    $intervalMeta = isset($md->interval) ? (string) $md->interval : null;

                    if (isset($md->advertisement_id)) {
                        $transactionType = 'advertisement';
                        $advertisementId = $md->advertisement_id;
                        $packageId = $md->package_id ?? 'unknown';
                        $advertisement = Advertisement::find($advertisementId);
                        if ($advertisement) {
                            $baseDescription = "Реклама: {$advertisement->title} ({$packageId})";
                        } else {
                            $baseDescription = "Реклама: Advertisement #{$advertisementId} ({$packageId})";
                        }
                    } elseif (
                        isset($md->subscription_id)
                        || (isset($md->type) && (string) $md->type === 'subscription')
                        || (isset($md->plan) && ! isset($md->advertisement_id))
                    ) {
                        $transactionType = 'subscription';
                        $planSlug = isset($md->plan) ? (string) $md->plan : '';
                        $planModel = $planSlug !== '' ? SubscriptionPlan::findBySlug($planSlug) : null;
                        $baseDescription = $planModel
                            ? 'Subscription: '.$planModel->name
                            : ($planSlug !== '' ? 'Subscription: '.$planSlug : 'Subscription payment');
                    } elseif ($charge->invoice !== null) {
                        $transactionType = 'subscription';
                        $planSlug = isset($md->plan) ? (string) $md->plan : '';
                        $planModel = $planSlug !== '' ? SubscriptionPlan::findBySlug($planSlug) : null;
                        $baseDescription = $planModel
                            ? 'Subscription: '.$planModel->name
                            : ((string) ($charge->description ?? '') !== ''
                                ? (string) $charge->description
                                : 'Subscription payment');
                    } else {
                        $descLower = strtolower((string) ($charge->description ?? ''));
                        if (str_contains($descLower, 'subscription')) {
                            $transactionType = 'subscription';
                        }
                        $baseDescription = (string) ($charge->description ?? '') !== ''
                            ? (string) $charge->description
                            : 'Card payment';
                    }

                    $currency = strtoupper($charge->currency ?? 'USD');
                    $chargeStatus = (string) ($charge->status ?? 'pending');

                    $invoiceRaw = $charge->invoice ?? null;
                    $stripeInvoiceId = null;
                    if ($invoiceRaw !== null && $invoiceRaw !== '') {
                        $stripeInvoiceId = is_string($invoiceRaw)
                            ? $invoiceRaw
                            : ($invoiceRaw->id ?? null);
                    }

                    if (! $skipChargeRow) {
                        $amountCents = (int) ($charge->amount ?? 0);
                        if ($amountCents > 0 || $chargeStatus !== 'succeeded') {
                            $transactions[] = [
                                'id' => $charge->id,
                                'type' => $transactionType,
                                'amount' => $amountCents / 100,
                                'currency' => $currency,
                                'status' => $chargeStatus === 'succeeded' ? 'succeeded' : $chargeStatus,
                                'description' => $baseDescription,
                                'plan' => $planMeta,
                                'interval' => $intervalMeta,
                                'created' => date('Y-m-d H:i:s', $charge->created),
                                'created_timestamp' => $charge->created,
                                'metadata' => [
                                    'advertisement_id' => $md->advertisement_id ?? null,
                                    'package_id' => $md->package_id ?? null,
                                    'subscription_id' => $md->subscription_id ?? null,
                                    'type' => $md->type ?? null,
                                    'plan' => $planMeta,
                                    'interval' => $intervalMeta,
                                    'stripe_invoice_id' => $stripeInvoiceId,
                                ],
                            ];
                        }
                    }

                    foreach ($charge->refunds->data ?? [] as $refund) {
                        $refundStatus = (string) ($refund->status ?? '');
                        if ($refundStatus === '' || $refundStatus === 'canceled') {
                            continue;
                        }
                        $transactions[] = [
                            'id' => $refund->id,
                            'type' => 'refund',
                            'amount' => ((int) ($refund->amount ?? 0)) / 100,
                            'currency' => strtoupper($refund->currency ?? $currency),
                            'status' => $refundStatus === 'succeeded' ? 'succeeded' : $refundStatus,
                            'description' => 'Refund: '.$baseDescription,
                            'plan' => $planMeta,
                            'interval' => $intervalMeta,
                            'created' => date('Y-m-d H:i:s', $refund->created),
                            'created_timestamp' => $refund->created,
                            'metadata' => [
                                'charge_id' => $charge->id,
                                'plan' => $planMeta,
                                'interval' => $intervalMeta,
                            ],
                        ];
                    }
                }
            }

            $transactions = $this->dedupeSubscriptionCheckoutCharges($transactions);

            usort($transactions, function ($a, $b) {
                return ($b['created_timestamp'] ?? 0) <=> ($a['created_timestamp'] ?? 0);
            });

            // Получаем последний ID для пагинации (устаревший курсор по Checkout; порядок после merge — по дате)
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

    /**
     * Get booking payments for the business billing page.
     */
    public function getBookingPayments(Request $request)
    {
        $user = auth('api')->user();
        $companyId = $request->input('current_company_id');

        if (!$companyId && $user->isBusinessOwner()) {
            $company = $user->ownedCompanies()->first();
            $companyId = $company?->id;
        }

        if (!$companyId && !$user->isSuperAdmin()) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        $query = Payment::with(['booking.service', 'booking.user.profile'])
            ->whereHas('booking', function ($q) use ($companyId, $user) {
                if (!$user->isSuperAdmin()) {
                    $q->where('company_id', $companyId);
                }
            })
            ->whereNotNull('booking_id')
            ->orderByDesc('created_at');

        $payments = $query->limit($request->input('limit', 50))->get();

        $result = $payments->map(function ($payment) {
            $booking = $payment->booking;
            $clientName = $booking?->client_name
                ?: ($booking?->user?->profile?->full_name ?? $booking?->user?->name ?? '—');
            $serviceName = $booking?->service?->name ?? '—';

            $amountCents = (float) $payment->amount;
            $feeCents = (float) ($payment->application_fee ?? 0);

            return [
                'id' => $payment->id,
                'type' => 'booking',
                'booking_id' => $payment->booking_id,
                'amount' => round($amountCents / 100, 2),
                'net_amount' => round(($amountCents - $feeCents) / 100, 2),
                'platform_fee' => round($feeCents / 100, 2),
                'currency' => strtoupper($payment->currency ?? 'USD'),
                'status' => $payment->status,
                'capture_status' => $payment->capture_status,
                'client_name' => $clientName,
                'service_name' => $serviceName,
                'description' => "{$serviceName} — {$clientName}",
                'created' => $payment->created_at?->format('Y-m-d H:i:s'),
                'created_timestamp' => $payment->created_at?->timestamp,
                'captured_at' => $payment->captured_at,
                'booking_status' => $booking?->status,
                'booking_date' => $booking?->booking_date,
            ];
        });

        return response()->json([
            'payments' => $result,
        ]);
    }

    /**
     * checkout.session.completed для mode=subscription:
     * - Stripe уже создал customer.subscription (получаем ID из $session->subscription).
     * - Создаём локальную запись Subscription, зеркалирующую Stripe-данные.
     * - Старую активную подписку компании отменяем в Stripe немедленно (если есть),
     *   чтобы не было двух одновременно платных подписок (upgrade-сценарий).
     */
    private function handleSubscriptionPayment($session, $metadata): void
    {
        $companyId = $metadata->company_id ?? null;
        $planSlug = $metadata->plan ?? null;
        $interval = $metadata->interval ?? 'month';
        $stripeSubId = $session->subscription ?? null;
        $stripeCustomerId = $session->customer ?? null;

        if (!$companyId || !$planSlug) {
            Log::error('Stripe webhook subscription: missing metadata', [
                'session_id' => $session->id,
            ]);
            return;
        }

        if (!$stripeSubId) {
            Log::error('Stripe webhook subscription: no subscription on session (mode=payment fallback?)', [
                'session_id' => $session->id,
            ]);
            return;
        }

        // Идемпотентность: уже создавали запись по этой сессии или по этой stripe_subscription_id.
        $alreadyProcessed = Subscription::where('stripe_session_id', $session->id)
            ->orWhere('stripe_subscription_id', $stripeSubId)
            ->exists();
        if ($alreadyProcessed) {
            Log::info('Subscription webhook duplicate ignored', [
                'session_id' => $session->id,
                'stripe_subscription_id' => $stripeSubId,
                'company_id' => $companyId,
            ]);
            return;
        }

        $planModel = SubscriptionPlan::findBySlug((string) $planSlug);

        // Получаем актуальное состояние Stripe Subscription (период, статус, price).
        try {
            StripeSubscriptionService::init();
            $stripeSub = StripeSubscription::retrieve($stripeSubId);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve Stripe Subscription after checkout', [
                'stripe_subscription_id' => $stripeSubId,
                'error' => $e->getMessage(),
            ]);
            return;
        }

        // С Stripe API 2025-09+ current_period_start/end переехали на items.data[N].
        $periodStartTs = $stripeSub->current_period_start
            ?? ($stripeSub->items->data[0]->current_period_start ?? null);
        $periodEndTs = $stripeSub->current_period_end
            ?? ($stripeSub->items->data[0]->current_period_end ?? null);

        $periodStart = $periodStartTs
            ? \Carbon\Carbon::createFromTimestamp($periodStartTs)
            : now();
        $periodEnd = $periodEndTs
            ? \Carbon\Carbon::createFromTimestamp($periodEndTs)
            : ($interval === 'year' ? now()->addYear() : now()->addMonth());

        $stripePriceId = $stripeSub->items->data[0]->price->id ?? null;
        $unitAmount = $stripeSub->items->data[0]->price->unit_amount ?? 0;
        $currency = strtolower($stripeSub->items->data[0]->price->currency ?? ($planModel?->currency ?? 'usd'));

        $oldStripeSubsToCancel = [];

        DB::transaction(function () use (
            $companyId, $planSlug, $session, $stripeSubId, $stripeCustomerId, $stripePriceId,
            $unitAmount, $currency, $interval, $periodStart, $periodEnd, $planModel, &$oldStripeSubsToCancel
        ) {
            // Повторная защита внутри транзакции — на случай гонки.
            if (Subscription::where('stripe_subscription_id', $stripeSubId)->lockForUpdate()->exists()) {
                return;
            }

            // Отметим старые активные подписки как canceled и соберём их Stripe-ID для отмены через API.
            $oldActive = Subscription::where('company_id', $companyId)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->lockForUpdate()
                ->get();

            foreach ($oldActive as $old) {
                if ($old->stripe_subscription_id && $old->stripe_subscription_id !== $stripeSubId) {
                    $oldStripeSubsToCancel[] = $old->stripe_subscription_id;
                }
                $old->forceFill(['status' => Subscription::STATUS_CANCELED])->save();
            }

            Subscription::create([
                'company_id' => $companyId,
                'plan' => $planSlug,
                'status' => Subscription::STATUS_ACTIVE,
                'stripe_session_id' => $session->id,
                'stripe_subscription_id' => $stripeSubId,
                'stripe_customer_id' => $stripeCustomerId,
                'stripe_price_id' => $stripePriceId,
                'price_cents' => (int) $unitAmount,
                'currency' => $currency,
                'interval' => $interval,
                'current_period_start' => $periodStart,
                'current_period_end' => $periodEnd,
                'cancel_at_period_end' => false,
                'canceled_at' => null,
                'grace_period_ends_at' => null,
                'scheduled_plan' => null,
                'previous_plan' => null,
            ]);
        });

        // Письмо «оплата подписки»: invoice.payment_succeeded иногда приходит раньше
        // checkout.session.completed — тогда локальной строки ещё нет и письмо теряется.
        // Дубли гасим в SubscriptionMailer по invoice.id (Cache).
        $newLocal = Subscription::where('stripe_subscription_id', $stripeSubId)->first();
        if ($newLocal) {
            $latestInvoiceRef = is_string($stripeSub->latest_invoice ?? null)
                ? $stripeSub->latest_invoice
                : ($stripeSub->latest_invoice->id ?? null);
            if ($latestInvoiceRef) {
                try {
                    $paidInvoice = StripeInvoice::retrieve($latestInvoiceRef, ['expand' => ['lines.data']]);
                    if (($paidInvoice->status ?? '') === 'paid') {
                        SubscriptionMailer::notifyPaymentSucceeded($newLocal, $paidInvoice);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Subscription email after checkout.session.completed failed', [
                        'stripe_subscription_id' => $stripeSubId,
                        'invoice_id' => $latestInvoiceRef,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        // Отменяем старые Stripe-подписки немедленно (вне транзакции — внешний API).
        // Это нужно для upgrade-сценария: чтобы клиента не списывали по двум планам.
        foreach ($oldStripeSubsToCancel as $oldStripeSubId) {
            try {
                StripeSubscriptionService::cancelImmediately($oldStripeSubId);
                Log::info('Old Stripe subscription canceled (after upgrade)', [
                    'old_stripe_subscription_id' => $oldStripeSubId,
                    'new_stripe_subscription_id' => $stripeSubId,
                    'company_id' => $companyId,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to cancel old Stripe subscription on upgrade', [
                    'old_stripe_subscription_id' => $oldStripeSubId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('Recurring subscription activated via webhook', [
            'company_id' => $companyId,
            'plan' => $planSlug,
            'stripe_subscription_id' => $stripeSubId,
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

    /**
     * Stripe Customer for the client who pays (booking owner), not the business user creating the PI.
     */
    private function ensureStripeCustomerForPayer(?User $payer, Booking $booking): ?string
    {
        if (! $payer || ! $payer->id) {
            return null;
        }
        if ($payer->stripe_customer_id) {
            return $payer->stripe_customer_id;
        }
        $email = $payer->email ?? $booking->client_email;
        if (! $email) {
            return null;
        }
        $payer->loadMissing('profile');
        $profile = $payer->profile;
        $first = $profile ? ($profile->first_name ?? '') : '';
        $last = $profile ? ($profile->last_name ?? '') : '';
        $name = trim($first.' '.$last);
        if ($name === '') {
            $name = $email;
        }
        try {
            $customer = StripeCustomer::create([
                'email' => $email,
                'name' => $name,
                'metadata' => ['app_user_id' => (string) $payer->id],
            ]);
            $payer->forceFill(['stripe_customer_id' => $customer->id])->save();

            return $customer->id;
        } catch (\Exception $e) {
            Log::warning('Stripe Customer create failed', [
                'user_id' => $payer->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Create a PaymentIntent for booking payment (manual capture / hold).
     */
    public function createBookingPayment(Request $request, $bookingId)
    {
        if (!PlatformSettingsService::isStripePaymentsEnabled()) {
            return response()->json([
                'error' => 'stripe_disabled',
                'message' => 'Stripe payments are disabled on this platform.',
            ], 403);
        }

        $booking = Booking::with('company')->find($bookingId);
        if (!$booking) {
            return response()->json(['error' => 'Booking not found'], 404);
        }

        $company = $booking->company;
        if (!$company) {
            return response()->json(['error' => 'Company not found'], 404);
        }

        if (!$company->isStripeConnected()) {
            return response()->json([
                'error' => 'stripe_not_connected',
                'message' => 'Business has not connected Stripe account.',
            ], 400);
        }

        if (!$company->canAcceptPayments()) {
            return response()->json([
                'error' => 'payments_blocked',
                'message' => 'Business cannot accept payments at this time.',
            ], 400);
        }

        $user = auth('api')->user();

        if ($booking->stripe_payment_intent_id) {
            try {
                $existingPi = PaymentIntent::retrieve($booking->stripe_payment_intent_id);
                if (in_array($existingPi->status, ['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture'])) {
                    return response()->json([
                        'client_secret' => $existingPi->client_secret,
                        'payment_intent_id' => $existingPi->id,
                        'status' => $existingPi->status,
                    ]);
                }
                if ($existingPi->status === 'succeeded') {
                    return response()->json([
                        'error' => 'already_paid',
                        'message' => 'Booking is already paid.',
                    ], 400);
                }
            } catch (\Exception $e) {
                Log::warning('Could not retrieve existing PaymentIntent', [
                    'booking_id' => $bookingId,
                    'pi_id' => $booking->stripe_payment_intent_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $amountCents = (int) round(($booking->total_price ?? $booking->price ?? 0) * 100);
        if ($amountCents < 50) {
            return response()->json([
                'error' => 'amount_too_low',
                'message' => 'Payment amount must be at least $0.50.',
            ], 400);
        }

        $feePercent = config('services.stripe.application_fee_percent', 10);
        $applicationFee = (int) round($amountCents * ($feePercent / 100));
        $currency = config('services.stripe.default_currency', 'usd');

        $clientUser = $booking->user_id ? User::with('profile')->find($booking->user_id) : null;
        $stripeCustomerId = $this->ensureStripeCustomerForPayer($clientUser, $booking);
        $receiptEmail = $booking->client_email ?? ($clientUser?->email);

        try {
            $piParams = [
                'amount' => $amountCents,
                'currency' => $currency,
                'capture_method' => 'manual',
                'application_fee_amount' => $applicationFee,
                'transfer_data' => [
                    'destination' => $company->stripe_account_id,
                ],
                'metadata' => [
                    'booking_id' => $booking->id,
                    'company_id' => $company->id,
                    'user_id' => $user?->id,
                ],
            ];
            if ($stripeCustomerId) {
                $piParams['customer'] = $stripeCustomerId;
            }
            if ($receiptEmail) {
                $piParams['receipt_email'] = $receiptEmail;
            }

            $paymentIntent = PaymentIntent::create($piParams, [
                'idempotency_key' => "booking_{$bookingId}_payment_v1",
            ]);

            $booking->update([
                'stripe_payment_intent_id' => $paymentIntent->id,
                'payment_status' => 'pending',
            ]);

            Payment::create([
                'booking_id' => $booking->id,
                'company_id' => $company->id,
                'user_id' => $user?->id,
                'stripe_payment_intent_id' => $paymentIntent->id,
                'amount' => $amountCents,
                'application_fee' => $applicationFee,
                'currency' => $currency,
                'status' => Payment::STATUS_PENDING,
                'capture_status' => Payment::CAPTURE_PENDING,
                'metadata' => [
                    'booking_id' => $booking->id,
                    'created_by' => $user?->id,
                ],
            ]);

            Log::info('PaymentIntent created for booking', [
                'booking_id' => $booking->id,
                'payment_intent_id' => $paymentIntent->id,
                'amount' => $amountCents,
                'fee' => $applicationFee,
            ]);

            return response()->json([
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
                'status' => $paymentIntent->status,
            ]);
        } catch (\Exception $e) {
            Log::error('PaymentIntent creation failed', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'payment_creation_failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Public endpoint: client creates/retrieves a PaymentIntent for their booking.
     * Only allowed when payment_status === 'pending_payment'.
     */
    public function createClientBookingPayment(Request $request, $bookingId)
    {
        if (!PlatformSettingsService::isStripePaymentsEnabled()) {
            return response()->json([
                'error' => 'stripe_disabled',
                'message' => 'Stripe payments are disabled on this platform.',
            ], 403);
        }

        $booking = Booking::with('company')->find($bookingId);
        if (!$booking) {
            return response()->json(['error' => 'Booking not found'], 404);
        }

        if ($booking->status === 'cancelled') {
            return response()->json([
                'error' => 'booking_cancelled',
                'message' => 'This booking is cancelled.',
            ], 422);
        }

        if ($booking->payment_status !== 'pending_payment') {
            return response()->json([
                'error' => 'payment_not_required',
                'message' => 'This booking does not require payment.',
            ], 422);
        }

        $authError = $this->assertClientOwnsBooking($request, $booking);
        if ($authError !== null) {
            return $authError;
        }

        $company = $booking->company;
        if (!$company || !$company->isStripeConnected() || !$company->canAcceptPayments()) {
            return response()->json([
                'error' => 'payments_unavailable',
                'message' => 'This business cannot accept payments at this time.',
            ], 400);
        }

        if ($booking->stripe_payment_intent_id) {
            try {
                $booking->refresh();
                if ($booking->payment_status !== 'pending_payment' || $booking->status === 'cancelled') {
                    return response()->json([
                        'error' => 'booking_expired',
                        'message' => 'Payment window has expired. Please create a new booking.',
                    ], 422);
                }

                $existingPi = PaymentIntent::retrieve($booking->stripe_payment_intent_id);
                if (in_array($existingPi->status, ['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture'])) {
                    return response()->json([
                        'client_secret' => $existingPi->client_secret,
                        'payment_intent_id' => $existingPi->id,
                        'status' => $existingPi->status,
                    ]);
                }
                if ($existingPi->status === 'succeeded') {
                    return response()->json([
                        'error' => 'already_paid',
                        'message' => 'Booking is already paid.',
                    ], 400);
                }
            } catch (\Exception $e) {
                Log::warning('Could not retrieve existing PaymentIntent for client pay', [
                    'booking_id' => $bookingId,
                    'pi_id' => $booking->stripe_payment_intent_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $user = auth('api')->user();

        $amountCents = (int) round(($booking->total_price ?? $booking->price ?? 0) * 100);
        if ($amountCents < 50) {
            return response()->json([
                'error' => 'amount_too_low',
                'message' => 'Payment amount must be at least $0.50.',
            ], 400);
        }

        $feePercent = config('services.stripe.application_fee_percent', 10);
        $applicationFee = (int) round($amountCents * ($feePercent / 100));
        $currency = config('services.stripe.default_currency', 'usd');

        $payer = $user ? User::with('profile')->find($user->id) : null;
        $stripeCustomerId = $this->ensureStripeCustomerForPayer($payer, $booking);
        $receiptEmail = $booking->client_email ?? ($payer?->email);

        try {
            $piParams = [
                'amount' => $amountCents,
                'currency' => $currency,
                'capture_method' => 'manual',
                'application_fee_amount' => $applicationFee,
                'transfer_data' => [
                    'destination' => $company->stripe_account_id,
                ],
                'metadata' => [
                    'booking_id' => $booking->id,
                    'company_id' => $company->id,
                    'user_id' => $user?->id,
                    'client_email' => $booking->client_email,
                ],
            ];
            if ($stripeCustomerId) {
                $piParams['customer'] = $stripeCustomerId;
            }
            if ($receiptEmail) {
                $piParams['receipt_email'] = $receiptEmail;
            }

            $paymentIntent = PaymentIntent::create($piParams, [
                'idempotency_key' => "client_booking_{$bookingId}_payment_v1",
            ]);

            $booking->refresh();
            if ($booking->payment_status !== 'pending_payment' || $booking->status === 'cancelled') {
                try {
                    $paymentIntent->cancel();
                } catch (\Exception $e) {
                    Log::warning('Cancelled orphan PaymentIntent after booking state changed', [
                        'pi_id' => $paymentIntent->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                return response()->json([
                    'error' => 'booking_expired',
                    'message' => 'Payment window has expired. Please create a new booking.',
                ], 422);
            }

            $booking->update([
                'stripe_payment_intent_id' => $paymentIntent->id,
            ]);

            Payment::create([
                'booking_id' => $booking->id,
                'company_id' => $company->id,
                'user_id' => $user?->id,
                'stripe_payment_intent_id' => $paymentIntent->id,
                'amount' => $amountCents,
                'application_fee' => $applicationFee,
                'currency' => $currency,
                'status' => Payment::STATUS_PENDING,
                'capture_status' => Payment::CAPTURE_PENDING,
                'metadata' => [
                    'booking_id' => $booking->id,
                    'initiated_by' => 'client',
                    'client_email' => $booking->client_email,
                ],
            ]);

            Log::info('Client PaymentIntent created for booking', [
                'booking_id' => $booking->id,
                'payment_intent_id' => $paymentIntent->id,
                'amount' => $amountCents,
                'fee' => $applicationFee,
            ]);

            return response()->json([
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
                'status' => $paymentIntent->status,
            ]);
        } catch (\Exception $e) {
            Log::error('Client PaymentIntent creation failed', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'payment_creation_failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Capture a previously authorized payment (hold -> capture).
     */
    public function captureBookingPayment(Request $request, $bookingId)
    {
        $booking = Booking::find($bookingId);
        if (!$booking) {
            return response()->json(['error' => 'Booking not found'], 404);
        }

        $user = auth('api')->user();
        $companyId = $request->input('current_company_id');

        if (!$user->isSuperAdmin() && $booking->company_id != $companyId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return DB::transaction(function () use ($booking, $user) {
            $payment = Payment::where('booking_id', $booking->id)
                ->lockForUpdate()
                ->first();

            if (!$payment) {
                return response()->json(['error' => 'Payment not found'], 404);
            }

            if ($payment->capture_status !== Payment::CAPTURE_PENDING) {
                return response()->json([
                    'status' => $payment->capture_status,
                    'message' => 'Payment already processed.',
                ]);
            }

            try {
                $paymentIntent = PaymentIntent::retrieve($payment->stripe_payment_intent_id);

                if ($paymentIntent->status === 'succeeded') {
                    $payment->update([
                        'status' => Payment::STATUS_SUCCEEDED,
                        'capture_status' => Payment::CAPTURE_CAPTURED,
                        'captured_at' => now(),
                    ]);
                    $booking->update(['payment_status' => 'paid']);

                    return response()->json([
                        'status' => 'captured',
                        'message' => 'Payment was already captured.',
                    ]);
                }

                if ($paymentIntent->status !== 'requires_capture') {
                    return response()->json([
                        'error' => 'cannot_capture',
                        'message' => "PaymentIntent status is {$paymentIntent->status}, cannot capture.",
                        'status' => $paymentIntent->status,
                    ], 400);
                }

                $capturedPi = $paymentIntent->capture();

                $payment->addAuditTrail('capture', $user?->id, $user?->role, [
                    'amount' => $payment->amount,
                ]);

                $payment->update([
                    'status' => Payment::STATUS_SUCCEEDED,
                    'capture_status' => Payment::CAPTURE_CAPTURED,
                    'captured_at' => now(),
                    'stripe_charge_id' => $capturedPi->latest_charge ?? null,
                    'metadata' => $payment->metadata,
                ]);

                $booking->update(['payment_status' => 'paid']);

                Log::info('Payment captured', [
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'amount' => $payment->amount,
                ]);

                return response()->json([
                    'status' => 'captured',
                    'message' => 'Payment captured successfully.',
                ]);
            } catch (\Exception $e) {
                Log::error('Payment capture failed', [
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'error' => 'capture_failed',
                    'message' => $e->getMessage(),
                ], 500);
            }
        });
    }

    /**
     * Refund a booking payment (full or partial).
     */
    public function refundBookingPayment(Request $request, $bookingId)
    {
        $validated = $request->validate([
            'amount' => 'nullable|numeric|min:0.01',
            'reason' => 'required|string|max:500',
        ]);

        $booking = Booking::find($bookingId);
        if (!$booking) {
            return response()->json(['error' => 'Booking not found'], 404);
        }

        $user = auth('api')->user();
        $companyId = $request->input('current_company_id');

        if (!$user->isSuperAdmin() && $booking->company_id != $companyId) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return DB::transaction(function () use ($validated, $booking, $user) {
            $payment = Payment::where('booking_id', $booking->id)
                ->lockForUpdate()
                ->first();

            if (!$payment) {
                return response()->json(['error' => 'Payment not found'], 404);
            }

            if (!$payment->canBeRefundedOrCancelled()) {
                return response()->json([
                    'error' => 'cannot_refund',
                    'message' => "Payment status is {$payment->status}, cannot refund or cancel.",
                ], 400);
            }

            $initiatedBy = $user->isSuperAdmin() ? Payment::INITIATED_BY_PLATFORM : Payment::INITIATED_BY_BUSINESS;

            try {
                // If payment is authorized but not captured — cancel the hold
                if ($payment->canBeCancelled()) {
                    $pi = PaymentIntent::retrieve($payment->stripe_payment_intent_id);

                    if (in_array($pi->status, ['requires_capture', 'requires_payment_method', 'requires_confirmation', 'requires_action'])) {
                        $pi->cancel();

                        $payment->addAuditTrail('cancel_hold', $user->id, $user->role, [
                            'reason' => $validated['reason'],
                        ]);

                        $payment->update([
                            'status' => Payment::STATUS_CANCELLED,
                            'capture_status' => Payment::CAPTURE_CANCELLED,
                            'refund_reason' => $validated['reason'],
                            'refund_initiated_by' => $initiatedBy,
                        ]);

                        $booking->update(['payment_status' => 'cancelled']);

                        Log::info('Payment hold cancelled', [
                            'booking_id' => $booking->id,
                            'payment_id' => $payment->id,
                            'reason' => $validated['reason'],
                        ]);

                        $booking->refresh();
                        app(\App\Services\BookingService::class)->notifyClientAboutRefundOrRelease($booking, false, 0.0, null);

                        return response()->json([
                            'status' => 'cancelled',
                            'action' => 'hold_cancelled',
                            'message' => 'Payment hold has been cancelled',
                        ]);
                    }

                    // If PI is already succeeded, fall through to refund logic
                }

                // Refund captured payment
                $refundAmountCents = $validated['amount']
                    ? (int) round($validated['amount'] * 100)
                    : null;

                $maxRefundable = $payment->getRefundableAmount();

                if ($refundAmountCents && $refundAmountCents > $maxRefundable) {
                    return response()->json([
                        'error' => 'amount_exceeds_refundable',
                        'message' => "Maximum refundable amount is $" . number_format($maxRefundable / 100, 2),
                        'max_refundable' => $maxRefundable / 100,
                    ], 400);
                }

                $refundParams = [
                    'payment_intent' => $payment->stripe_payment_intent_id,
                    'refund_application_fee' => true,
                    'reverse_transfer' => true,
                ];

                if ($refundAmountCents) {
                    $refundParams['amount'] = $refundAmountCents;
                }

                $refund = Refund::create($refundParams);

                $actualRefundedCents = $refund->amount;
                $isFullRefund = ($payment->refunded_amount + $actualRefundedCents) >= $payment->amount;

                $payment->addAuditTrail('refund', $user->id, $user->role, [
                    'amount' => $actualRefundedCents,
                    'reason' => $validated['reason'],
                    'refund_id' => $refund->id,
                ]);

                $payment->update([
                    'status' => $isFullRefund ? Payment::STATUS_REFUNDED : Payment::STATUS_PARTIALLY_REFUNDED,
                    'refunded_amount' => $payment->refunded_amount + $actualRefundedCents,
                    'refund_reason' => $validated['reason'],
                    'refund_initiated_by' => $initiatedBy,
                    'metadata' => $payment->metadata,
                ]);

                if ($isFullRefund) {
                    $booking->update(['payment_status' => 'refunded']);
                }

                Log::info('Payment refunded', [
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'refund_id' => $refund->id,
                    'amount' => $actualRefundedCents,
                    'is_full' => $isFullRefund,
                ]);

                $booking->refresh();
                $payment->refresh();
                $toClientDollars = round($actualRefundedCents / 100, 2);
                $retainedAfterCents = (int) $payment->amount - (int) $payment->refunded_amount;
                $retainedDollars = round($retainedAfterCents / 100, 2);
                if ($isFullRefund) {
                    app(\App\Services\BookingService::class)->notifyClientAboutRefundOrRelease(
                        $booking,
                        true,
                        $toClientDollars,
                        null
                    );
                } else {
                    app(\App\Services\BookingService::class)->notifyClientAboutRefundOrRelease(
                        $booking,
                        true,
                        $toClientDollars,
                        max(0.0, $retainedDollars)
                    );
                }

                return response()->json([
                    'status' => $isFullRefund ? 'refunded' : 'partially_refunded',
                    'refund_id' => $refund->id,
                    'refunded_amount' => $actualRefundedCents / 100,
                    'total_refunded' => $payment->refunded_amount / 100,
                ]);
            } catch (\Exception $e) {
                Log::error('Payment refund/cancel failed', [
                    'booking_id' => $booking->id,
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);

                return response()->json([
                    'error' => 'refund_failed',
                    'message' => $e->getMessage(),
                ], 500);
            }
        });
    }

    /**
     * Public: check if client can still confirm payment (avoids race with 30-min cancel).
     */
    public function getBookingPaymentEligibility(Request $request, $bookingId)
    {
        $booking = Booking::find($bookingId);
        if (!$booking) {
            return response()->json(['error' => 'Booking not found'], 404);
        }

        $authError = $this->assertClientOwnsBooking($request, $booking);
        if ($authError !== null) {
            return $authError;
        }

        $canPay = $booking->payment_status === 'pending_payment'
            && $booking->status !== 'cancelled';

        return response()->json([
            'can_pay' => $canPay,
            'payment_status' => $booking->payment_status,
            'booking_status' => $booking->status,
            'error' => $canPay ? null : 'booking_expired',
            'message' => $canPay ? null : 'This booking can no longer be paid.',
        ]);
    }

    private function assertClientOwnsBooking(Request $request, Booking $booking): ?\Illuminate\Http\JsonResponse
    {
        $clientEmail = $request->input('client_email') ?? $request->query('client_email');
        $user = auth('api')->user();
        $isOwner = ($user && $booking->user_id && (int) $booking->user_id === (int) $user->id)
            || ($clientEmail && $booking->client_email && strtolower((string) $clientEmail) === strtolower((string) $booking->client_email));

        if (!$isOwner) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return null;
    }

    private function voidPaymentIntentForStaleBooking(string $paymentIntentId, Payment $payment, string $reason): void
    {
        try {
            $pi = PaymentIntent::retrieve($paymentIntentId);
            if (in_array($pi->status, ['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture'])) {
                $pi->cancel();
            } elseif ($pi->status === 'succeeded') {
                Refund::create([
                    'payment_intent' => $paymentIntentId,
                    'refund_application_fee' => true,
                    'reverse_transfer' => true,
                ]);
            }
        } catch (\Exception $e) {
            Log::warning('voidPaymentIntentForStaleBooking failed', [
                'payment_intent_id' => $paymentIntentId,
                'reason' => $reason,
                'error' => $e->getMessage(),
            ]);
        }

        $payment->addAuditTrail('void_stale_booking', null, 'system', ['reason' => $reason]);
        $payment->update([
            'status' => Payment::STATUS_EXPIRED,
            'capture_status' => Payment::CAPTURE_CANCELLED,
        ]);
    }

    /**
     * Убирает дубликат: одна и та же оплата как Checkout Session (cs_) и как Charge (ch_).
     */
    private function dedupeSubscriptionCheckoutCharges(array $transactions): array
    {
        $n = count($transactions);
        if ($n < 2) {
            return $transactions;
        }
        $remove = array_fill(0, $n, false);
        for ($i = 0; $i < $n; $i++) {
            for ($j = 0; $j < $n; $j++) {
                if ($i === $j || $remove[$i] || $remove[$j]) {
                    continue;
                }
                $a = $transactions[$i];
                $b = $transactions[$j];
                if (($a['type'] ?? '') !== 'subscription' || ($b['type'] ?? '') !== 'subscription') {
                    continue;
                }
                if (($a['status'] ?? '') !== 'succeeded' || ($b['status'] ?? '') !== 'succeeded') {
                    continue;
                }
                $idA = (string) ($a['id'] ?? '');
                $idB = (string) ($b['id'] ?? '');
                if ($idA === '' || $idB === '') {
                    continue;
                }
                $aCs = str_starts_with($idA, 'cs_');
                $bCs = str_starts_with($idB, 'cs_');
                $aCh = str_starts_with($idA, 'ch_');
                $bCh = str_starts_with($idB, 'ch_');
                if (($aCs && $bCh && $this->billingSameSubscriptionFingerprint($a, $b)) ||
                    ($aCh && $bCs && $this->billingSameSubscriptionFingerprint($a, $b))) {
                    $remove[$aCh ? $i : $j] = true;
                }
            }
        }
        $out = [];
        for ($k = 0; $k < $n; $k++) {
            if (! $remove[$k]) {
                $out[] = $transactions[$k];
            }
        }

        return $out;
    }

    private function billingSameSubscriptionFingerprint(array $a, array $b): bool
    {
        if (strtoupper((string) ($a['currency'] ?? '')) !== strtoupper((string) ($b['currency'] ?? ''))) {
            return false;
        }
        if (abs((float) ($a['amount'] ?? 0) - (float) ($b['amount'] ?? 0)) > 0.009) {
            return false;
        }

        return abs((int) ($a['created_timestamp'] ?? 0) - (int) ($b['created_timestamp'] ?? 0)) <= 420;
    }

    private function refundPaymentIntentForStaleBooking(string $paymentIntentId, Payment $payment, Booking $booking): void
    {
        try {
            Refund::create([
                'payment_intent' => $paymentIntentId,
                'refund_application_fee' => true,
                'reverse_transfer' => true,
            ]);
            $payment->addAuditTrail('refund_stale_booking', null, 'system', ['booking_id' => $booking->id]);
            $payment->update([
                'status' => Payment::STATUS_REFUNDED,
                'refunded_amount' => $payment->amount,
            ]);
        } catch (\Exception $e) {
            Log::error('refundPaymentIntentForStaleBooking failed', [
                'payment_intent_id' => $paymentIntentId,
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
