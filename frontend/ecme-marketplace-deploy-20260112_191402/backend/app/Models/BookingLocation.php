<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BookingLocation extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'booking_id',
        'type',
        'address_line1',
        'city',
        'state',
        'zip',
        'lat',
        'lng',
        'notes',
    ];

    /**
     * Get the booking that owns the location.
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
