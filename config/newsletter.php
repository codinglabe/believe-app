<?php

return [
    /*
    | One-time price (USD) to unlock By role / Organizations / Custom newsletter targeting forever.
    | This is separate from the user’s platform subscription — set via .env only.
    */
    'pro_targeting_lifetime_price_usd' => (float) env('NEWSLETTER_PRO_TARGETING_PRICE_USD', 49),

    /*
    | Set to 0 to disable checkout (e.g. staging without Stripe product).
    */
    'pro_targeting_purchase_enabled' => filter_var(env('NEWSLETTER_PRO_TARGETING_PURCHASE_ENABLED', true), FILTER_VALIDATE_BOOL),
];
