<?php

namespace App\Services;

use Stripe\Checkout\Session as CheckoutSession;
use Stripe\PaymentIntent;
use Stripe\Stripe;

/**
 * Живые снимки объектов Stripe для суперадмин-биллинга (технические поля).
 */
class StripeAdminTransactionEnricherService
{
    public function __construct()
    {
        $key = config('services.stripe.secret');
        if ($key) {
            Stripe::setApiKey($key);
        }
    }

    public function isConfigured(): bool
    {
        return ! empty(config('services.stripe.secret'));
    }

    /**
     * PaymentIntent (Connect / бронирования) с charge и balance transaction.
     *
     * @return array<string, mixed>|null
     */
    public function snapshotPaymentIntent(string $paymentIntentId): ?array
    {
        if (! $this->isConfigured() || $paymentIntentId === '') {
            return null;
        }

        try {
            $pi = PaymentIntent::retrieve($paymentIntentId, [
                'expand' => [
                    'latest_charge.balance_transaction',
                    'latest_charge.transfer',
                ],
            ]);
        } catch (\Throwable $e) {
            return [
                'error' => $e->getMessage(),
            ];
        }

        return $this->buildSnapshotFromPaymentIntentObject($pi);
    }

    /**
     * Checkout Session (подписки / реклама) + вложенный PaymentIntent.
     *
     * @return array<string, mixed>|null
     */
    public function snapshotCheckoutSession(string $checkoutSessionId): ?array
    {
        if (! $this->isConfigured() || $checkoutSessionId === '') {
            return null;
        }

        try {
            $session = CheckoutSession::retrieve($checkoutSessionId, [
                'expand' => [
                    'payment_intent.latest_charge.balance_transaction',
                    'payment_intent.latest_charge.transfer',
                ],
            ]);
        } catch (\Throwable $e) {
            return [
                'error' => $e->getMessage(),
            ];
        }

        $pi = $session->payment_intent ?? null;
        $piDetails = is_object($pi)
            ? $this->buildSnapshotFromPaymentIntentObject($pi)
            : null;

        $customer = $session->customer ?? null;
        $customerId = is_string($customer) ? $customer : (is_object($customer) ? ($customer->id ?? null) : null);

        return [
            'checkout_session' => [
                'id' => $session->id,
                'object' => $session->object ?? 'checkout.session',
                'status' => $session->status ?? null,
                'payment_status' => $session->payment_status ?? null,
                'mode' => $session->mode ?? null,
                'customer' => $customerId,
                'amount_total' => $session->amount_total,
                'amount_subtotal' => $session->amount_subtotal ?? null,
                'currency' => $session->currency,
                'created' => $session->created ?? null,
                'payment_intent' => is_string($pi) ? $pi : (is_object($pi) ? ($pi->id ?? null) : null),
            ],
            'payment_intent_details' => $piDetails,
        ];
    }

    /**
     * @param  \Stripe\PaymentIntent  $pi
     * @return array<string, mixed>
     */
    private function buildSnapshotFromPaymentIntentObject($pi): array
    {
        $charge = $pi->latest_charge ?? null;
        $chargeObj = is_object($charge) ? $charge : null;

        $bt = null;
        if ($chargeObj && isset($chargeObj->balance_transaction)) {
            $bt = $chargeObj->balance_transaction;
            if (is_string($bt)) {
                $bt = null;
            }
        }

        $transferId = null;
        if ($chargeObj && isset($chargeObj->transfer)) {
            $tr = $chargeObj->transfer;
            $transferId = is_string($tr) ? $tr : (is_object($tr) ? ($tr->id ?? null) : null);
        }

        $disputeId = null;
        if ($chargeObj && isset($chargeObj->dispute)) {
            $d = $chargeObj->dispute;
            $disputeId = is_string($d) ? $d : (is_object($d) ? ($d->id ?? null) : null);
        }

        return [
            'payment_intent' => [
                'id' => $pi->id,
                'object' => $pi->object ?? 'payment_intent',
                'status' => $pi->status ?? null,
                'amount' => $pi->amount ?? null,
                'amount_capturable' => $pi->amount_capturable ?? null,
                'amount_received' => $pi->amount_received ?? null,
                'currency' => $pi->currency ?? null,
                'capture_method' => $pi->capture_method ?? null,
                'confirmation_method' => $pi->confirmation_method ?? null,
                'created' => $pi->created ?? null,
                'payment_method_types' => $pi->payment_method_types ?? [],
                'transfer_group' => $pi->transfer_group ?? null,
                'application_fee_amount' => $pi->application_fee_amount ?? null,
                'cancellation_reason' => $pi->cancellation_reason ?? null,
                'metadata' => $this->metadataToArray($pi->metadata ?? null),
            ],
            'last_payment_error' => $pi->last_payment_error ? [
                'code' => $pi->last_payment_error->code ?? null,
                'message' => $pi->last_payment_error->message ?? null,
                'type' => $pi->last_payment_error->type ?? null,
            ] : null,
            'charge' => $chargeObj ? [
                'id' => $chargeObj->id,
                'paid' => $chargeObj->paid ?? null,
                'refunded' => $chargeObj->refunded ?? null,
                'dispute' => $disputeId,
                'receipt_url' => $chargeObj->receipt_url ?? null,
                'transfer' => $transferId,
                'outcome' => isset($chargeObj->outcome) && is_object($chargeObj->outcome) ? [
                    'network_status' => $chargeObj->outcome->network_status ?? null,
                    'reason' => $chargeObj->outcome->reason ?? null,
                    'risk_level' => $chargeObj->outcome->risk_level ?? null,
                    'seller_message' => $chargeObj->outcome->seller_message ?? null,
                    'type' => $chargeObj->outcome->type ?? null,
                ] : null,
            ] : null,
            'balance_transaction' => ($bt && is_object($bt)) ? [
                'id' => $bt->id ?? null,
                'fee' => $bt->fee ?? null,
                'net' => $bt->net ?? null,
                'currency' => $bt->currency ?? null,
                'reporting_category' => $bt->reporting_category ?? null,
                'status' => $bt->status ?? null,
                'type' => $bt->type ?? null,
                'available_on' => $bt->available_on ?? null,
            ] : null,
        ];
    }

    /**
     * @param  mixed  $metadata
     */
    private function metadataToArray($metadata): array
    {
        if ($metadata === null) {
            return [];
        }
        if (is_object($metadata) && method_exists($metadata, 'toArray')) {
            return $metadata->toArray();
        }

        $json = json_decode(json_encode($metadata), true);

        return is_array($json) ? $json : [];
    }
}
