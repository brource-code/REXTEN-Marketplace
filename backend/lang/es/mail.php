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
];
