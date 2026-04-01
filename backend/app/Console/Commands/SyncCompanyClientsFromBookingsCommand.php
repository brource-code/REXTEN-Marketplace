<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Заполняет company_clients по существующим бронированиям (разовая подтяжка после включения авто-синка).
 */
class SyncCompanyClientsFromBookingsCommand extends Command
{
    protected $signature = 'company:sync-clients-from-bookings';

    protected $description = 'Insert missing company_clients rows from bookings (CLIENT users only)';

    public function handle(): int
    {
        $pairs = Booking::query()
            ->whereNotNull('user_id')
            ->get(['company_id', 'user_id'])
            ->unique(fn ($b) => $b->company_id.'-'.$b->user_id)
            ->values();

        $n = 0;
        foreach ($pairs as $row) {
            $user = User::query()->find($row->user_id);
            if (!$user || strtoupper((string) $user->role) !== 'CLIENT') {
                continue;
            }
            DB::table('company_clients')->insertOrIgnore([
                'company_id' => $row->company_id,
                'user_id' => $row->user_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $n++;
        }

        $this->info("Проверено уникальных пар company–client: {$pairs->count()}, обработано строк CLIENT: {$n}.");

        return self::SUCCESS;
    }
}
