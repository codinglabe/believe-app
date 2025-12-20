export interface PhazeWebhook {
    id: number;
    phaze_webhook_id: number | null;
    url: string;
    api_key: string;
    authorization_header_name: string;
    account_id: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PhazeWebhookFormData {
    url: string;
    api_key?: string;
    authorization_header_name?: string;
}

