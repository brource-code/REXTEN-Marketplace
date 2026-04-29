<?php

namespace App\Http\Controllers;

use App\Models\Advertisement;
use App\Models\Company;
use App\Models\Service;
use App\Models\ServiceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Лёгкие публичные ответы для SEO: sitemap, метаданные без тяжёлых joins.
 */
class SeoController extends Controller
{
    /**
     * Активные объявления маркетплейса для индексации (slug для /marketplace/{slug}).
     */
    public function marketplaceListings(Request $request)
    {
        /** @var array<string, \Carbon\Carbon|null> $bestTs */
        $bestTs = [];

        $query = Advertisement::query()
            ->whereIn('type', ['regular', 'advertisement'])
            ->where('is_active', true)
            ->where('status', 'approved')
            ->whereNotNull('status')
            ->where(function ($q) {
                $q->where('type', 'regular')
                    ->orWhere(function ($q2) {
                        $q2->where('type', 'advertisement')
                            ->where('start_date', '<=', now())
                            ->where('end_date', '>=', now())
                            ->whereNotNull('start_date')
                            ->whereNotNull('end_date');
                    });
            })
            ->whereHas('company', function ($q) {
                $q->where('is_visible_on_marketplace', true);
            })
            ->select(['id', 'link', 'updated_at']);

        foreach ($query->cursor() as $ad) {
            $slug = $this->publicListingSlug($ad);
            if ($slug === null || $slug === '') {
                continue;
            }
            $this->mergeSlugTimestamp($bestTs, (string) $slug, $ad->updated_at);
        }

        $serviceRows = Service::query()
            ->where('is_active', true)
            ->whereHas('company', function ($q) {
                $q->where('status', 'active')
                    ->where('is_visible_on_marketplace', true);
            })
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->select(['slug', 'updated_at'])
            ->cursor();

        foreach ($serviceRows as $svc) {
            $slug = trim((string) $svc->slug);
            if ($slug === '') {
                continue;
            }
            $this->mergeSlugTimestamp($bestTs, $slug, $svc->updated_at);
        }

        $listings = [];
        foreach ($bestTs as $slug => $ts) {
            $listings[] = [
                'slug' => $slug,
                'updated_at' => $ts ? $ts->toAtomString() : null,
            ];
        }

        return response()->json(['listings' => $listings]);
    }

    /**
     * @param  array<string, \Carbon\Carbon|null>  $map
     */
    private function mergeSlugTimestamp(array &$map, string $slug, $ts): void
    {
        if (! isset($map[$slug])) {
            $map[$slug] = $ts;

            return;
        }
        if ($ts && (! $map[$slug] || $ts->gt($map[$slug]))) {
            $map[$slug] = $ts;
        }
    }

    /**
     * Компании с публичной витриной (slug для /marketplace/company/{slug}).
     */
    public function companies(Request $request)
    {
        $rows = Company::query()
            ->where('is_visible_on_marketplace', true)
            ->where('status', 'active')
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->select(['slug', 'updated_at'])
            ->orderBy('id')
            ->get();

        $companies = $rows->map(fn ($c) => [
            'slug' => $c->slug,
            'updated_at' => $c->updated_at ? $c->updated_at->toAtomString() : null,
        ]);

        return response()->json(['companies' => $companies]);
    }

    /**
     * Категории услуг (slug + name для будущих SEO landing pages).
     */
    public function categories(Request $request)
    {
        $rows = ServiceCategory::query()
            ->orderBy('name')
            ->get(['slug', 'name', 'updated_at']);

        $categories = $rows->map(fn ($c) => [
            'slug' => $c->slug,
            'name' => $c->name,
            'updated_at' => $c->updated_at ? $c->updated_at->toAtomString() : null,
        ]);

        return response()->json(['categories' => $categories]);
    }

    /**
     * Пары state/city из объявлений для будущих landing pages (минимальный набор).
     */
    public function locations(Request $request)
    {
        $rows = Advertisement::query()
            ->whereIn('type', ['regular', 'advertisement'])
            ->where('is_active', true)
            ->where('status', 'approved')
            ->whereHas('company', function ($q) {
                $q->where('is_visible_on_marketplace', true);
            })
            ->whereNotNull('state')
            ->where('state', '!=', '')
            ->select(['state', 'city'])
            ->distinct()
            ->get();

        $pairs = [];
        foreach ($rows as $r) {
            $city = trim((string) ($r->city ?? ''));
            $state = trim((string) ($r->state ?? ''));
            if ($state === '') {
                continue;
            }
            $pairs[] = [
                'state' => $state,
                'city' => $city !== '' ? $city : null,
            ];
        }

        return response()->json(['locations' => $pairs]);
    }

    /**
     * Пути SEO-лендингов каталога (/services/{category}/…​) с датой последнего изменения объявления.
     */
    public function seoLandingPaths(Request $request)
    {
        $query = Advertisement::query()
            ->whereIn('type', ['regular', 'advertisement'])
            ->where('is_active', true)
            ->where('status', 'approved')
            ->whereNotNull('status')
            ->where(function ($q) {
                $q->where('type', 'regular')
                    ->orWhere(function ($q2) {
                        $q2->where('type', 'advertisement')
                            ->where('start_date', '<=', now())
                            ->where('end_date', '>=', now())
                            ->whereNotNull('start_date')
                            ->whereNotNull('end_date');
                    });
            })
            ->whereHas('company', function ($q) {
                $q->where('is_visible_on_marketplace', true);
            })
            ->whereNotNull('category_slug')
            ->where('category_slug', '!=', '')
            ->select(['category_slug', 'state', 'city', 'updated_at']);

        /** @var array<string, \Carbon\Carbon|null> $latestByPath */
        $latestByPath = [];

        foreach ($query->cursor() as $ad) {
            $cat = (string) $ad->category_slug;
            $state = strtoupper(trim((string) ($ad->state ?? '')));
            $city = trim((string) ($ad->city ?? ''));
            $ts = $ad->updated_at;

            $this->mergeLandingPathTimestamp($latestByPath, '/services/'.$cat, $ts);

            if ($state !== '' && strlen($state) === 2) {
                $this->mergeLandingPathTimestamp($latestByPath, '/services/'.$cat.'/'.$state, $ts);
            }

            if ($state !== '' && strlen($state) === 2 && $city !== '') {
                $citySlug = Str::slug($city);
                if ($citySlug !== '') {
                    $this->mergeLandingPathTimestamp($latestByPath, '/services/'.$cat.'/'.$state.'/'.$citySlug, $ts);
                }
            }
        }

        $paths = [];
        foreach ($latestByPath as $path => $dt) {
            $paths[] = [
                'path' => $path,
                'updated_at' => $dt ? $dt->toAtomString() : null,
            ];
        }

        return response()->json(['paths' => $paths]);
    }

    /**
     * @param  array<string, \Carbon\Carbon|null>  $map
     */
    private function mergeLandingPathTimestamp(array &$map, string $path, $ts): void
    {
        if (!isset($map[$path])) {
            $map[$path] = $ts;

            return;
        }
        if ($ts && (!$map[$path] || $ts->gt($map[$path]))) {
            $map[$path] = $ts;
        }
    }

    /**
     * Нормализует link объявления до slug в URL /marketplace/{slug}.
     */
    private function publicListingSlug(Advertisement $ad): ?string
    {
        $link = $ad->link;
        if ($link === null || $link === '') {
            return (string) $ad->id;
        }
        $link = trim((string) $link);
        if ($link === '') {
            return (string) $ad->id;
        }
        if (filter_var($link, FILTER_VALIDATE_URL)) {
            return (string) $ad->id;
        }
        $link = str_replace(['/marketplace/', 'marketplace/'], '', $link);
        $link = trim($link, '/');
        if ($link === '') {
            return (string) $ad->id;
        }
        if (str_contains($link, '/')) {
            $parts = explode('/', $link);

            return (string) end($parts);
        }

        return $link;
    }
}
