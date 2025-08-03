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
    avatar?: string;
    image?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
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

export interface PageProps {
  transactions: PaginationData<Transaction>
}
