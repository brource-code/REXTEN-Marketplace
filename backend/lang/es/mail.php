<?php

return [
    'reset_password' => [
        'subject' => 'Restablecer contraseña — :app',
        'preheader' => 'Restablecimiento de contraseña para tu cuenta :app.',
        'title' => 'Restablecer contraseña',
        'intro' => 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para elegir una nueva contraseña.',
        'button' => 'Restablecer contraseña',
        'expires' => 'Este enlace caduca en :count minutos.',
        'ignore' => 'Si no solicitaste el restablecimiento, ignora este correo. Tu contraseña no cambiará.',
        'footer' => 'Este mensaje fue enviado por :app.',
        'plain' => "Restablecer contraseña:\n:url\n\nEl enlace caduca en :count minutos.\n\nSi no lo solicitaste, ignora este correo.",
    ],
    'business_owner' => [
        'preheader' => 'Notificación: :title',
        'open_dashboard' => 'Abrir el panel',
        'note' => 'Recibes este correo por la configuración de notificaciones de tu negocio para :app.',
        'footer' => 'Este mensaje fue enviado por :app.',
    ],
    'client' => [
        'preheader' => 'Notificación: :title',
        'open_bookings' => 'Ver reservas',
        'note' => 'Recibes este correo por la configuración de notificaciones de reservas para :app.',
        'footer' => 'Este mensaje fue enviado por :app.',
    ],
];
