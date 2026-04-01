<?php

namespace App\Enums;

enum BusinessEventType: string
{
    case BUSINESS_REGISTERED = 'business_registered';
    case LARGE_ORDER = 'large_order';
    case CAMPAIGN_STARTED = 'campaign_started';
    case COMPLAINT_RECEIVED = 'complaint_received';
    case MILESTONE_REACHED = 'milestone_reached';
    case PAYMENT_RECEIVED = 'payment_received';
    case BUSINESS_VERIFIED = 'business_verified';
    case REVIEW_FLAGGED = 'review_flagged';
}
