/** Single row for Printify provider comparison on product create (from /printify/provider-comparison). */
export interface PrintifyProviderComparisonRow {
    id: number;
    title: string;
    is_printify_choice: boolean;
    /** Lowest base+shipping among comparable providers (same blueprint). */
    is_recommended: boolean;
    base_cost_cents: number | null;
    shipping_first_item_cents: number | null;
    currency: string;
    handling_time_label: string | null;
    country_code: string | null;
    country_label: string | null;
    /**
     * Relative score by cost rank (server-side). Printify does not publish public star ratings;
     * this is for UI comparison only.
     */
    average_rating: number | null;
}

export interface PrintifyWebhook {
    id: string;
    url: string;
    topic: string[];
    created_at: string;
    updated_at: string;
}

export interface WebhookFormData {
    url: string;
    topic: string[];
}

export interface WebhookResponse {
    success: boolean;
    data?: PrintifyWebhook[];
    message?: string;
    error?: string;
}
