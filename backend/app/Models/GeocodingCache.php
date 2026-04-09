<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GeocodingCache extends Model
{
    public $timestamps = false;

    protected $table = 'geocoding_cache';

    protected $fillable = [
        'address_hash',
        'original_address',
        'latitude',
        'longitude',
        'formatted_address',
        'confidence',
        'provider',
        'created_at',
        'expires_at',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'confidence' => 'decimal:2',
        'created_at' => 'datetime',
        'expires_at' => 'datetime',
    ];
}
