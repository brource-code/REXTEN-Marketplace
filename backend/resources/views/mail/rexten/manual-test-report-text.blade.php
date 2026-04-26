{{ $emailTitle }}

{{ $intro }}

@foreach($fields as $row)
{{ $row['label'] }}: {{ $row['value'] }}
@endforeach
@if(!empty($actionUrl) && !empty($actionLabel))

{{ $actionLabel }}: {{ $actionUrl }}
@endif

{{ __('mail.manual_test_report.note', ['app' => $appName], $locale) }}

—
{{ __('mail.manual_test_report.footer', ['app' => $appName], $locale) }}
