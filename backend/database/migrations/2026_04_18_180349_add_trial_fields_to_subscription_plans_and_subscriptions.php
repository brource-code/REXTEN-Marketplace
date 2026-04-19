<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Триал для новых компаний.
     *
     * subscription_plans:
     *  - trial_days        — длительность триала на этом плане (0 = без триала).
     *  - is_trial_default  — план, выдаваемый новым компаниям как триал.
     *                        Должен быть только один (контролируется в контроллере),
     *                        иначе используется первый найденный.
     *
     * subscriptions:
     *  - trial_ends_at     — момент окончания триала. Подписка остаётся
     *                        обычной (status=active), но cron в LifecycleService
     *                        переведёт её на free план, как только триал истечёт
     *                        (для триальных подписок без stripe_subscription_id).
     */
    public function up(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            $table->unsignedSmallInteger('trial_days')->default(0)->after('is_free');
            $table->boolean('is_trial_default')->default(false)->after('trial_days');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('trial_ends_at')->nullable()->after('grace_period_ends_at');
            $table->index('trial_ends_at');
        });

        // Дефолт: 14-дневный триал на Professional.
        DB::table('subscription_plans')
            ->where('slug', 'professional')
            ->update([
                'trial_days' => 14,
                'is_trial_default' => true,
            ]);
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['trial_ends_at']);
            $table->dropColumn('trial_ends_at');
        });

        Schema::table('subscription_plans', function (Blueprint $table) {
            $table->dropColumn(['trial_days', 'is_trial_default']);
        });
    }
};
