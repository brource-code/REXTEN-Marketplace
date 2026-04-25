<!DOCTYPE html>
<html lang="{{ $locale }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="only light">
    <meta name="supported-color-schemes" content="light">
    <title>{{ $emailTitle }}</title>
    <style type="text/css">
        :root { color-scheme: light; }
        @media (prefers-color-scheme: dark) {
            .rexten-email-outer { background-color: #f3f4f6 !important; }
            .rexten-email-card { background-color: #ffffff !important; }
            .rexten-email-head { background-color: #ffffff !important; }
            .rexten-email-foot { background-color: #f9fafb !important; }
            .rexten-text-heading {
                color: #111827 !important;
                -webkit-text-fill-color: #111827 !important;
            }
            .rexten-text-body {
                color: #6b7280 !important;
                -webkit-text-fill-color: #6b7280 !important;
            }
            .rexten-text-subtle {
                color: #9ca3af !important;
                -webkit-text-fill-color: #9ca3af !important;
            }
            .rexten-email-logo-img { filter: none !important; opacity: 1 !important; }
            .rexten-sub-row td { border-color: #e5e7eb !important; }
            .rexten-sub-label {
                color: #6b7280 !important;
                -webkit-text-fill-color: #6b7280 !important;
            }
            .rexten-sub-value {
                color: #111827 !important;
                -webkit-text-fill-color: #111827 !important;
            }
            .rexten-sub-total-row td { border-color: #d1d5db !important; }
            .rexten-sub-total-label {
                color: #111827 !important;
                -webkit-text-fill-color: #111827 !important;
            }
            .rexten-sub-total-value {
                color: #111827 !important;
                -webkit-text-fill-color: #111827 !important;
            }
        }
    </style>
    <!--[if mso]>
    <style type="text/css">
        table { border-collapse: collapse; }
        .rexten-btn a { color: #ffffff !important; text-decoration: none !important; }
    </style>
    <![endif]-->
</head>
<body class="rexten-email-outer" style="margin:0;padding:0;background-color:#f3f4f6;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        {{ $preheader }}
    </div>
    <table role="presentation" class="rexten-email-outer" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f4f6" style="background-color:#f3f4f6;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" class="rexten-email-card" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width:560px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,0.06);">
                    <tr>
                        <td class="rexten-email-head" bgcolor="#ffffff" style="padding:24px 28px 16px 28px;background-color:#ffffff;border-bottom:1px solid #e5e7eb;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td class="rexten-email-logo" style="width:48px;vertical-align:top;padding:0 16px 0 0;">
                                        @include('mail.rexten.partials.email-logo-embed')
                                    </td>
                                    <td style="vertical-align:top;padding:0;">
                                        <p class="rexten-text-heading" style="margin:0;font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#111827 !important;-webkit-text-fill-color:#111827;letter-spacing:-0.02em;">
                                            {{ $appName }}
                                        </p>
                                        <p class="rexten-text-heading" style="margin:8px 0 0 0;font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#111827 !important;-webkit-text-fill-color:#111827;">
                                            {{ $emailTitle }}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td bgcolor="#ffffff" style="padding:24px 28px 8px 28px;background-color:#ffffff;">
                            <p class="rexten-text-body" style="margin:0;font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1.6;color:#6b7280 !important;-webkit-text-fill-color:#6b7280;">
                                {{ $intro }}
                            </p>
                        </td>
                    </tr>
                    @if(!empty($fields))
                        <tr>
                            <td bgcolor="#ffffff" style="padding:8px 28px 8px 28px;background-color:#ffffff;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                    @foreach($fields as $row)
                                        <tr class="rexten-sub-row">
                                            <td style="padding:10px 0;border-top:1px solid #e5e7eb;vertical-align:top;width:50%;">
                                                <span class="rexten-sub-label" style="font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:#6b7280 !important;-webkit-text-fill-color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;">
                                                    {{ $row['label'] }}
                                                </span>
                                            </td>
                                            <td style="padding:10px 0;border-top:1px solid #e5e7eb;vertical-align:top;text-align:right;">
                                                <span class="rexten-sub-value" style="font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#111827 !important;-webkit-text-fill-color:#111827;word-break:break-word;">
                                                    {!! nl2br(e($row['value'])) !!}
                                                </span>
                                            </td>
                                        </tr>
                                    @endforeach
                                    @if(!empty($total))
                                        <tr class="rexten-sub-total-row">
                                            <td style="padding:14px 0 6px 0;border-top:2px solid #d1d5db;vertical-align:top;">
                                                <span class="rexten-sub-total-label" style="font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:#111827 !important;-webkit-text-fill-color:#111827;text-transform:uppercase;letter-spacing:0.04em;">
                                                    {{ $total['label'] }}
                                                </span>
                                            </td>
                                            <td style="padding:14px 0 6px 0;border-top:2px solid #d1d5db;vertical-align:top;text-align:right;">
                                                <span class="rexten-sub-total-value" style="font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:#111827 !important;-webkit-text-fill-color:#111827;">
                                                    {{ $total['value'] }}
                                                </span>
                                            </td>
                                        </tr>
                                    @endif
                                </table>
                            </td>
                        </tr>
                    @endif
                    @if(!empty($actionUrl) && !empty($actionLabel))
                        <tr>
                            <td style="padding:16px 28px 24px 28px;" align="center">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="rexten-btn">
                                    <tr>
                                        <td style="border-radius:8px;background-color:#2563eb;">
                                            <a href="{{ $actionUrl }}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                                                {{ $actionLabel }}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    @endif
                    @if(!empty($noteText))
                        <tr>
                            <td bgcolor="#ffffff" style="padding:0 28px 24px 28px;background-color:#ffffff;">
                                <p class="rexten-text-body" style="margin:0;font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;line-height:1.6;color:#6b7280 !important;-webkit-text-fill-color:#6b7280;">
                                    {{ $noteText }}
                                </p>
                            </td>
                        </tr>
                    @endif
                    <tr>
                        <td class="rexten-email-foot" bgcolor="#f9fafb" style="padding:16px 28px 24px 28px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                            <p class="rexten-text-subtle" style="margin:0;font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;line-height:1.5;color:#9ca3af !important;-webkit-text-fill-color:#9ca3af;">
                                {{ $footerText }}
                            </p>
                        </td>
                    </tr>
                </table>
                <p class="rexten-text-subtle" style="margin:20px 0 0 0;font-family:Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;color:#9ca3af !important;-webkit-text-fill-color:#9ca3af;text-align:center;">
                    © {{ date('Y') }} {{ $appName }}
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
