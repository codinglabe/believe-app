"use client";

import { syncCsrfMetaFromCookie, updateCsrfMeta } from "@/lib/csrf";
import { useEffect } from "react";
import { usePage } from "@inertiajs/react";

/**
 * Keeps the document <meta name="csrf-token"> in sync with Inertia page props.
 * Run this on every page (e.g. in layouts) so CSRF never mismatches and 419 is avoided
 * on public view pages, after login, and on PWA.
 */
export function CsrfTokenSync() {
    const { props } = usePage<{ csrf_token?: string }>();

    useEffect(() => {
        if (typeof document === "undefined") return;

        const token = props?.csrf_token;
        if (token) {
            updateCsrfMeta(token);
            return;
        }

        syncCsrfMetaFromCookie();
    }, [props?.csrf_token]);

    return null;
}
