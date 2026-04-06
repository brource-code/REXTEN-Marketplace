<?php

return [
    'reset_password' => [
        'subject' => 'Reset your password — :app',
        'preheader' => 'Password reset for your :app account.',
        'title' => 'Reset your password',
        'intro' => 'We received a request to reset the password for your account. Click the button below to choose a new password.',
        'button' => 'Reset password',
        'expires' => 'This link expires in :count minutes.',
        'ignore' => 'If you did not request a password reset, you can ignore this email. Your password will stay the same.',
        'footer' => 'This message was sent by :app.',
        'plain' => "Reset your password:\n:url\n\nThis link expires in :count minutes.\n\nIf you did not request this, ignore this email.",
    ],
    'business_owner' => [
        'preheader' => 'Notification: :title',
        'open_dashboard' => 'Open dashboard',
        'note' => 'You receive this email because of your business notification settings for :app.',
        'footer' => 'This message was sent by :app.',
    ],
    'client' => [
        'preheader' => 'Notification: :title',
        'open_bookings' => 'View bookings',
        'note' => 'You receive this email because of your booking notification settings for :app.',
        'footer' => 'This message was sent by :app.',
    ],
];
