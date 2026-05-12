import { AlertTriangle } from 'lucide-react';

export function SweepstakesComplianceBanner() {
    return (
        <div
            role="region"
            aria-label="Legal compliance notice"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/35 dark:text-amber-50"
        >
            <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <div className="space-y-1 leading-relaxed">
                    <p className="font-semibold text-amber-950 dark:text-amber-100">Compliance notice</p>
                    <p className="text-amber-950/90 dark:text-amber-100/90">
                        Sweepstakes laws vary by state and country. Organizations are responsible for legal compliance.
                        Believe In Unity provides tools but does not provide legal advice.
                    </p>
                </div>
            </div>
        </div>
    );
}
