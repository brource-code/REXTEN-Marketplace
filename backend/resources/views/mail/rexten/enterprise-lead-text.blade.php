{{ $emailTitle }}

{{ $intro }}

@foreach($fields as $row)
{{ $row['label'] }}: {{ $row['value'] }}
@endforeach
@if(!empty($actionUrl) && !empty($actionLabel))

{{ $actionLabel }}: {{ $actionUrl }}
@endif

{{ __('mail.enterprise_lead.note', ['app' => $appName], $locale) }}

—
{{ __('mail.enterprise_lead.footer', ['app' => $appName], $locale) }}
