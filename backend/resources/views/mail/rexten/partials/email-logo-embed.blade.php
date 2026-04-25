{{-- Вложение cid: из официального mark (frontend/src/app/icon.svg) → PNG для клиентов без SVG --}}
@php
    $logoPath = resource_path('views/mail/rexten/assets/rexten-email-icon.png');
    $logoSrc = isset($message) && is_readable($logoPath) ? $message->embed($logoPath) : '';
@endphp
@if($logoSrc !== '')
    <img
        class="rexten-email-logo-img"
        src="{{ $logoSrc }}"
        width="32"
        height="40"
        alt="REXTEN"
        style="display:block;border:0;outline:none;text-decoration:none;width:32px;height:40px;"
    >
@endif
