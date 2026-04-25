<?php

/**
 * Генерация PNG-марки REXTEN для писем (та же геометрия, что и frontend/src/app/icon.svg).
 * Почтовые клиенты не показывают inline SVG — используется вложение из Blade partial.
 *
 * Запуск из корня репозитория:
 *   php backend/scripts/generate-email-logo.php
 * или напрямую:
 *   node backend/scripts/generate-rexten-email-icon.mjs
 */

$script = __DIR__ . '/generate-rexten-email-icon.mjs';
if (! is_readable($script)) {
    fwrite(STDERR, "Missing script: {$script}\n");
    exit(1);
}

$node = PHP_OS_FAMILY === 'Windows' ? 'node.exe' : 'node';
passthru(sprintf('%s %s', escapeshellarg($node), escapeshellarg($script)), $code);
exit($code ?? 0);
