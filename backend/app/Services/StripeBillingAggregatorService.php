<?php

namespace App\Services;

use App\Models\Advertisement;
use Stripe\Checkout\Session;
use Stripe\Stripe;

/**
 * Сбор оплаченных Checkout Session из Stripe для биллинга суперадмина.
 */
class StripeBillingAggregatorService
{
    private const PAGE_LIMIT = 100;

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
     * @return list<array<string, mixed>>
     */
    public function collectPaidSessions(int $createdGte, int $createdLte, int $maxRecords = 3000): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        $rows = [];
        $startingAfter = null;
        $pages = 0;
        $maxPages = (int) ceil($maxRecords / self::PAGE_LIMIT) + 5;

        try {
            while ($pages < $maxPages && count($rows) < $maxRecords) {
                $params = [
                    'limit' => self::PAGE_LIMIT,
                    'created' => [
                        'gte' => $createdGte,
                        'lte' => $createdLte,
                    ],
                ];
                if ($startingAfter) {
                    $params['starting_after'] = $startingAfter;
                }

                $result = Session::all($params);
                foreach ($result->data as $session) {
                    if ($session->payment_status !== 'paid') {
                        continue;
                    }
                    $rows[] = $this->normalizeSession($session);
                    if (count($rows) >= $maxRecords) {
                        break 2;
                    }
                }

                if (! $result->has_more || count($result->data) === 0) {
                    break;
                }
                $startingAfter = $result->data[count($result->data) - 1]->id;
                $pages++;
            }
        } catch (\Throwable $e) {
            throw new \RuntimeException('Stripe: '.$e->getMessage(), 0, $e);
        }

        $this->enrichAdvertisementDescriptions($rows);

        return $rows;
    }

    /**
     * Неоплаченные сессии (ожидают оплаты), за последние N дней.
     *
     * @return list<array<string, mixed>>
     */
    public function collectOpenSessions(int $days = 14, int $maxRecords = 200): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        $createdGte = now()->subDays($days)->timestamp;
        $createdLte = now()->timestamp;
        $rows = [];
        $startingAfter = null;

        try {
            for ($p = 0; $p < 20 && count($rows) < $maxRecords; $p++) {
                $params = [
                    'limit' => self::PAGE_LIMIT,
                    'created' => ['gte' => $createdGte, 'lte' => $createdLte],
                ];
                if ($startingAfter) {
                    $params['starting_after'] = $startingAfter;
                }
                $result = Session::all($params);
                foreach ($result->data as $session) {
                    if ($session->payment_status === 'unpaid' && ($session->status === 'open' || $session->status === 'expired')) {
                        $meta = $session->metadata ?? (object) [];
                        $rows[] = [
                            'id' => $session->id,
                            'status' => $session->status,
                            'payment_status' => $session->payment_status,
                            'amount' => $session->amount_total ? $session->amount_total / 100 : 0,
                            'currency' => strtoupper($session->currency ?? 'USD'),
                            'created' => $session->created,
                            'company_id' => isset($meta->company_id) ? (int) $meta->company_id : null,
                        ];
                    }
                }
                if (! $result->has_more) {
                    break;
                }
                $startingAfter = $result->data[count($result->data) - 1]->id;
            }
        } catch (\Throwable $e) {
            throw new \RuntimeException('Stripe: '.$e->getMessage(), 0, $e);
        }

        return $rows;
    }

    /**
     * @param  \Stripe\Checkout\Session  $session
     * @return array<string, mixed>
     */
    private function normalizeSession($session): array
    {
        $metadata = $session->metadata ?? (object) [];
        $type = 'unknown';
        if (isset($metadata->advertisement_id)) {
            $type = 'advertisement';
        } elseif (isset($metadata->subscription_id)) {
            $type = 'subscription';
        }

        $advertisementId = isset($metadata->advertisement_id) ? (int) $metadata->advertisement_id : null;
        $packageId = $metadata->package_id ?? null;
        $companyId = isset($metadata->company_id) ? (int) $metadata->company_id : null;

        $description = 'Payment';
        if ($type === 'advertisement' && $advertisementId) {
            $description = "Ad #{$advertisementId}".($packageId ? " ({$packageId})" : '');
        } elseif ($type === 'subscription') {
            $description = 'Subscription';
        }

        $created = (int) $session->created;

        return [
            'id' => $session->id,
            'type' => $type,
            'amount' => $session->amount_total ? $session->amount_total / 100 : 0,
            'currency' => strtoupper($session->currency ?? 'USD'),
            'status' => 'succeeded',
            'description' => $description,
            'created' => $created,
            'created_at' => date('Y-m-d H:i:s', $created),
            'date' => date('Y-m-d', $created),
            'company_id' => $companyId,
            'advertisement_id' => $advertisementId,
            'package_id' => $packageId,
            'subscription_id' => $metadata->subscription_id ?? null,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function enrichAdvertisementDescriptions(array &$rows): void
    {
        $adIds = [];
        foreach ($rows as $r) {
            if (($r['type'] ?? '') === 'advertisement' && ! empty($r['advertisement_id'])) {
                $adIds[(int) $r['advertisement_id']] = true;
            }
        }
        if ($adIds === []) {
            return;
        }
        $ads = Advertisement::whereIn('id', array_keys($adIds))->get()->keyBy('id');
        foreach ($rows as $i => $r) {
            if (($r['type'] ?? '') !== 'advertisement' || empty($r['advertisement_id'])) {
                continue;
            }
            $ad = $ads->get((int) $r['advertisement_id']);
            if ($ad) {
                $pkg = $r['package_id'] ?? '';
                $rows[$i]['description'] = "Ad: {$ad->title}".($pkg ? " ({$pkg})" : '');
            }
        }
    }
}
