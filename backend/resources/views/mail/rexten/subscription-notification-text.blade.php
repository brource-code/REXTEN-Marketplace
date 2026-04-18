{{ $emailTitle }}

{{ $intro }}
@if(!empty($fields))

@foreach($fields as $row)
{{ $row['label'] }}: {{ $row['value'] }}
@endforeach
@endif
@if(!empty($total))

{{ $total['label'] }}: {{ $total['value'] }}
@endif
@if(!empty($actionUrl) && !empty($actionLabel))

{{ $actionLabel }}: {{ $actionUrl }}
@endif
@if(!empty($noteText))

{{ $noteText }}
@endif

—
{{ $footerText }}
