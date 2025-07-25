export interface NodeShare {
    id: number;
    cost: string;
    node_boss_id: number;
    node_id: number;
    remaining: string;
    sold: string;
    created_at: string;
    updated_at: string;
}

export interface NodeBoss {
    id: number;
    uuid: string;
    name: string;
    nodeshares: NodeShare[];
    description: string;
    slug: string;
    suggested_amounts: number[];
    is_closed: boolean;
    image: string | null;
    image_url: string | null;
    status: 'active' | 'inactive' | 'draft';
    user_id: number;
    organization_id: number | null;
    price: number;
    shares_available: number;
    shares_sold: number;
    start_date: string;
    end_date: string;
    created_by: number;
    created_at: string;
    updated_at: string;
}

export interface NodeBossFilters {
    search?: string;
    status?: string;
    sort_by?: string;
    is_closed?: boolean;
    sort_order?: 'asc' | 'desc';
}

export interface PaginatedNodeBoss {
    data: NodeBoss[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}
