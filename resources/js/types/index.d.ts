import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
    permission?: string,
    role?: string,
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    permission?: string | Array;
    role?: string | Array;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role?: string;
    organization_role?: string;
    avatar?: string;
    image?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    timezone?: string;
    contact_number?: string;
    whatsapp_opt_in: boolean;
    push_token?: string;
    login_status: boolean;
    [key: string]: unknown; // This allows for additional properties...
}
export interface DashboardProps {
    auth: Auth;
    permissions: Array;
}


export interface Transaction {
  id: number
  user_id: number
  related_id: number | null
  related_type: string | null
  type: "deposit" | "withdrawal" | "purchase" | "refund" | "transfer"
  status: "pending" | "completed" | "failed" | "cancelled"
  amount: number
  fee: number
  currency: string
  payment_method: string | null
  transaction_id: string | null
  meta: Record<string> | null
  processed_at: string // ISO 8601 string
  created_at: string
  updated_at: string
}

export interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

export interface PaginationData<T> {
  current_page: number
  data: T[]
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: PaginationLink[]
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

export interface PaginatedResponse<T> {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
        current_page: number;
        from: number;
        last_page: number;
        links: any[];
        path: string;
        per_page: number;
        to: number;
        total: number;
}

export interface PageProps {
  transactions: PaginationData<Transaction>
}

export interface Organization {
    id: number;
    user_id: number;
    name: string;
    ein: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    website?: string;
    description: string;
    mission: string;
    classification?: string;
    status: string;
    ntee_code?: string;
    registration_status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    board_members?: BoardMember[];
    // ... other organization fields from your database
}

export interface ContentItem {
    id: number;
    organization_id: number;
    user_id: number;
    user: User;
    type: 'prayer' | 'devotional' | 'scripture';
    title: string;
    body: string;
    meta: {
        scripture_ref?: string;
        image_url?: string;
        tags?: string[];
    };
    is_approved: boolean;
    created_at: string;
    updated_at: string;
}

export interface Campaign {
    id: number;
    organization_id: number;
    user_id: number;
    user: User;
    name: string;
    start_date: string;
    end_date: string;
    send_time_local: string;
    channels: ('push' | 'whatsapp' | 'web')[];
    rrule?: any;
    status: 'active' | 'paused' | 'cancelled';
    created_at: string;
    updated_at: string;
    scheduled_drops?: ScheduledDrop[];
    scheduled_drops_count?: number;
}

export interface ScheduledDrop {
    id: number;
    campaign_id: number;
    content_item_id: number;
    content_item: ContentItem;
    publish_at_utc: string;
    status: 'pending' | 'expanded' | 'sent' | 'cancelled';
    created_at: string;
    updated_at: string;
    send_jobs?: SendJob[];
}

export interface SendJob {
    id: number;
    scheduled_drop_id: number;
    user_id: number;
    user: User;
    channel: 'push' | 'whatsapp' | 'web';
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    idempotency_key: string;
    error?: string;
    sent_at?: string;
    metadata?: any;
    created_at: string;
    updated_at: string;
}

export interface NotificationData {
    id: string;
    type: string;
    data: {
        content_id: number;
        title: string;
        body: string;
        image_url?: string;
        scripture_ref?: string;
        channel: string;
        created_at: string;
    };
    read_at: string | null;
    created_at: string;
}

export interface CampaignStats {
    total_drops: number;
    sent_drops: number;
    pending_drops: number;
    total_sends: number;
    successful_sends: number;
}

export interface BoardMember {
    id: number;
    organization_id: number;
    user_id: number;
    position: string;
    is_active: boolean;
    appointed_on: string;
    term_ends_on: string | null;
    created_at: string;
    updated_at: string;
    user: User;
    histories?: BoardMemberHistory[];
}

export interface BoardMemberHistory {
    id: number;
    board_member_id: number;
    action: string;
    details: string | null;
    changed_by: number;
    created_at: string;
    updated_at: string;
    changed_by_user?: User;
}


export interface Meeting {
  id: number
  meeting_id: string
  title: string
  description: string
  scheduled_at: string
  duration_minutes: number
  status: string
  course: {
    id: number
    name: string
    slug: string
  }
  instructor: {
    id: number
    name: string
    email: string
  }
}

export interface MeetingLink {
  id: number
  token: string
  role: "host" | "student" | "organization" | "user"
  expires_at: string
}

export interface Participant {
  id: number
  user: User
  role: "host" | "student" | "organization" | "user"
  status: string
  is_muted: boolean
  is_video_enabled: boolean
  joined_at: string
}

export interface ChatMessage {
  id: number
  user: User
  content: string
  timestamp: string
  type: "text" | "emoji" | "highlight" | "system"
  meeting_id: number
  created_at: string
}
