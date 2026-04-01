<?php

namespace App\Enums;

enum AlertSeverity: string
{
    case CRITICAL = 'critical';
    case WARNING = 'warning';
    case INFO = 'info';
}
