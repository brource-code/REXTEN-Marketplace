<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Route extends Model
{
    use HasFactory;
    use HasUuids;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_STALE = 'stale';

    public const STATUS_OPTIMIZING = 'optimizing';

    public const STATUS_READY = 'ready';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    protected $table = 'routes';

    protected $fillable = [
        'company_id',
        'specialist_id',
        'route_date',
        'status',
        'total_distance_meters',
        'total_duration_seconds',
        'start_latitude',
        'start_longitude',
        'path_lng_lat',
        'include_return_leg',
        'cache_version',
        'optimized_at',
        'included_booking_ids',
    ];

    protected $casts = [
        'route_date' => 'date',
        'optimized_at' => 'datetime',
        'start_latitude' => 'decimal:8',
        'start_longitude' => 'decimal:8',
        'included_booking_ids' => 'array',
        'path_lng_lat' => 'array',
        'include_return_leg' => 'boolean',
    ];

    public $incrementing = false;

    protected $keyType = 'string';

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function specialist(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class, 'specialist_id');
    }

    public function stops(): HasMany
    {
        return $this->hasMany(RouteStop::class, 'route_id')->orderBy('sequence_order');
    }

    public function markStale(): void
    {
        $this->status = self::STATUS_STALE;
        $this->save();
    }

    public function incrementCacheVersion(): void
    {
        $this->increment('cache_version');
    }

    public function getCacheKey(): string
    {
        return sprintf(
            'route:%s:v%d',
            $this->getKey(),
            (int) $this->cache_version
        );
    }
}
