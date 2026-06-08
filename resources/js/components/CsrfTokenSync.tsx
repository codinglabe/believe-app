"use client";

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
        const token = props?.csrf_token;
        if (!token || typeof document === "undefined") return;

        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            meta.setAttribute("content", token);
        } else {
            const newMeta = document.createElement("meta");
            newMeta.name = "csrf-token";
            newMeta.content = token;
            document.head.appendChild(newMeta);
        }
    }, [props?.csrf_token]);

    return null;
}
