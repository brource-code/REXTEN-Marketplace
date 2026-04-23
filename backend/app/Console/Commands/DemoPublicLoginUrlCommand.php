<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DemoPublicLoginUrlCommand extends Command
{
    protected $signature = 'demo:public-login-url';

    protected $description = 'Показать URL публичного демо-входа и напоминание по переменным .env';

    public function handle(): int
    {
        $base = rtrim((string) config('app.frontend_url'), '/');
        $url = $base.'/business/demo-login';

        $this->info('Ссылка для гостей (без пароля, без параметров в URL):');
        $this->line($url);
        $this->newLine();
        $this->comment('На backend в .env:');
        $this->line('DEMO_PUBLIC_LOGIN_ENABLED=true (по умолчанию уже true, выключить: false)');
        $this->line('Опционально: DEMO_PUBLIC_LOGIN_USER_ID=<id в users>');
        $this->line('Иначе берётся пользователь с email DEMO_PUBLIC_LOGIN_USER_EMAIL (по умолчанию demo@rexten.pro).');

        return self::SUCCESS;
    }
}
