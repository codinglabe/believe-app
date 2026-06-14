import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Strip non-digits and format as MM/DD while typing (max 4 digits). */
export function formatMmDdInput(value: string | null | undefined): string {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
        return digits;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Pad digit input to MM/DD for submit and server validation. */
export function normalizeMmDd(value: string | null | undefined): string {
    const trimmed = String(value ?? '').trim();
    const digits = trimmed.replace(/\D/g, '').slice(0, 4);
    if (digits.length !== 4) {
        return trimmed;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

export function isValidMmDd(value: string | null | undefined): boolean {
    const normalized = normalizeMmDd(value);
    if (!normalized) {
        return false;
    }
    if (!/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(normalized)) {
        return false;
    }
    const [month, day] = normalized.split('/').map((part) => Number(part));
    const date = new Date(2000, month - 1, day);
    return date.getFullYear() === 2000 && date.getMonth() === month - 1 && date.getDate() === day;
}
