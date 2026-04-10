<?php

return [
    /*
    | Grace period in days after a plan downgrade is applied (new subscription row).
    | During this time the UI shows warnings; creation is blocked when active usage >= limit.
    */
    'grace_period_days' => (int) env('SUBSCRIPTION_GRACE_PERIOD_DAYS', 7),
];
