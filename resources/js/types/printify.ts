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
