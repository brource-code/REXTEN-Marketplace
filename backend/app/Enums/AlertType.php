<?php

namespace App\Enums;

enum AlertType: string
{
    case HIGH_CHURN = 'high_churn';
    case INACTIVE_BUSINESSES = 'inactive_businesses';
    case CONVERSION_DROP = 'conversion_drop';
    case PENDING_MODERATION = 'pending_moderation';
    case PAYMENT_FAILED = 'payment_failed';
    case LOW_RATING = 'low_rating';
}
