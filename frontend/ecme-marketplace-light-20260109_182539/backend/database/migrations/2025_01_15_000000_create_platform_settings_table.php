<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('site_name')->nullable();
            $table->text('site_description')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('logo_light')->nullable(); // URL для светлого логотипа
            $table->string('logo_dark')->nullable(); // URL для темного логотипа
            $table->string('logo_icon_light')->nullable(); // URL для иконки (светлая)
            $table->string('logo_icon_dark')->nullable(); // URL для иконки (темная)
            $table->timestamps();
        });

        // Вставляем начальные настройки
        DB::table('platform_settings')->insert([
            'site_name' => 'Ecme Marketplace',
            'site_description' => 'Платформа для управления бизнесом',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};

