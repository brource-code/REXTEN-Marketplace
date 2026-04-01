<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdvertisementDisplay extends Model
{
    use HasFactory;

    protected $fillable = [
        'advertisement_id',
        'session_id',
        'user_id',
        'placement',
        'displayed_at',
        'state',
        'city',
    ];
    
    protected $casts = [
        'displayed_at' => 'datetime',
    ];
    
    public function advertisement()
    {
        return $this->belongsTo(Advertisement::class);
    }
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
