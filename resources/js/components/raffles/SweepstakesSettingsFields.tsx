import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/frontend/ui/textarea';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type SweepstakesType = 'free' | 'donation' | 'hybrid';

interface SweepstakesSettingsFieldsProps {
    data: Record<string, unknown>;
    setData: (key: string, value: unknown) => void;
    errors: Partial<Record<string, string>>;
}

export function SweepstakesSettingsFields({ data, setData, errors }: SweepstakesSettingsFieldsProps) {
    const type = (data.sweepstakes_type as SweepstakesType | undefined) ?? 'hybrid';

    const setType = (t: SweepstakesType) => setData('sweepstakes_type', t);

    return (
        <div className="space-y-8">
            <div className="rounded-xl border border-border bg-muted/20 p-4 dark:bg-muted/10">
                <Label className="text-base font-semibold text-foreground">Sweepstakes type</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                    Donation cannot be required to enter. Offer a free path when using donation or hybrid campaigns.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {(
                        [
                            ['free', 'Free entry', 'No donation path required.'],
                            ['donation', 'Donation-based', 'Suggested donation for entries (must still offer NPN if applicable).'],
                            ['hybrid', 'Hybrid', 'Mix of free and optional donation entries.'],
                        ] as const
                    ).map(([value, title, desc]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setType(value)}
                            className={cn(
                                'rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                                type === value
                                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                    : 'border-border bg-background hover:bg-muted/40',
                            )}
                        >
                            <span className="font-semibold text-foreground">{title}</span>
                            <span className="mt-1 block text-xs leading-snug text-muted-foreground">{desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                    <Checkbox
                        id="npn_entry_enabled"
                        checked={Boolean(data.npn_entry_enabled)}
                        onCheckedChange={(v) => setData('npn_entry_enabled', v === true)}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="npn_entry_enabled" className="cursor-pointer font-medium text-foreground">
                            No purchase necessary entry available
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            When enabled, your public page will show that a free method of entry exists (mail-in / online
                            instructions will be expanded in a future release).
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <Label className="text-base font-semibold text-foreground">Entry methods</Label>
                    <p className="text-sm text-muted-foreground">Select how participants may enter this campaign.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    {(
                        [
                            ['entry_free_online_enabled', 'Free online entry'],
                            ['entry_donation_enabled', 'Donation entry'],
                            ['entry_mail_in_enabled', 'Mail-in entry'],
                            ['entry_social_bonus_enabled', 'Social sharing bonus entry'],
                            ['entry_volunteer_enabled', 'Volunteer participation entry'],
                        ] as const
                    ).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                            <Checkbox
                                id={key}
                                checked={Boolean(data[key])}
                                onCheckedChange={(v) => setData(key, v === true)}
                            />
                            <Label htmlFor={key} className="cursor-pointer text-sm font-normal leading-snug">
                                {label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="max_entries_per_person">Maximum entries per person</Label>
                    <Input
                        id="max_entries_per_person"
                        type="number"
                        min={1}
                        value={(data.max_entries_per_person as string) ?? ''}
                        onChange={(e) => setData('max_entries_per_person', e.target.value)}
                        placeholder="Unlimited if empty"
                    />
                    {errors.max_entries_per_person ? (
                        <p className="text-sm text-red-500">{errors.max_entries_per_person}</p>
                    ) : null}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="minimum_age">Minimum age</Label>
                    <Input
                        id="minimum_age"
                        type="number"
                        min={13}
                        max={120}
                        value={(data.minimum_age as string) ?? ''}
                        onChange={(e) => setData('minimum_age', e.target.value)}
                        placeholder="e.g. 18"
                    />
                    {errors.minimum_age ? <p className="text-sm text-red-500">{errors.minimum_age}</p> : null}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="max_free_entries">Maximum free entries</Label>
                    <Input
                        id="max_free_entries"
                        type="number"
                        min={0}
                        value={(data.max_free_entries as string) ?? ''}
                        onChange={(e) => setData('max_free_entries', e.target.value)}
                        placeholder="Optional"
                    />
                    {errors.max_free_entries ? (
                        <p className="text-sm text-red-500">{errors.max_free_entries}</p>
                    ) : null}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="max_donation_entries">Maximum donation entries</Label>
                    <Input
                        id="max_donation_entries"
                        type="number"
                        min={0}
                        value={(data.max_donation_entries as string) ?? ''}
                        onChange={(e) => setData('max_donation_entries', e.target.value)}
                        placeholder="Optional"
                    />
                    {errors.max_donation_entries ? (
                        <p className="text-sm text-red-500">{errors.max_donation_entries}</p>
                    ) : null}
                </div>
            </div>

            <div className="space-y-4">
                <Label className="text-base font-semibold text-foreground">Eligibility</Label>
                <div className="space-y-2">
                    <Label htmlFor="country_restrictions_text">Country restrictions</Label>
                    <Input
                        id="country_restrictions_text"
                        value={(data.country_restrictions_text as string) ?? ''}
                        onChange={(e) => setData('country_restrictions_text', e.target.value)}
                        placeholder="ISO codes, comma-separated (e.g. US)"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="state_restrictions_text">State / province restrictions</Label>
                    <Input
                        id="state_restrictions_text"
                        value={(data.state_restrictions_text as string) ?? ''}
                        onChange={(e) => setData('state_restrictions_text', e.target.value)}
                        placeholder="e.g. TX, OK"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="eligibility_rules">Organization eligibility rules</Label>
                    <Textarea
                        id="eligibility_rules"
                        value={(data.eligibility_rules as string) ?? ''}
                        onChange={(e) => setData('eligibility_rules', e.target.value)}
                        placeholder="Who may enter, residency, exclusions, etc."
                        rows={4}
                    />
                    {errors.eligibility_rules ? (
                        <p className="text-sm text-red-500">{errors.eligibility_rules}</p>
                    ) : null}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <Label htmlFor="official_rules" className="text-base font-semibold">
                            Official sweepstakes rules
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Paste your rules or use the generator (draft only — legal review required).
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => {
                            toast(
                                'Official rules generator is coming soon. Organizations should have counsel review all rules before publishing.',
                            );
                        }}
                    >
                        Generate official rules
                    </Button>
                </div>
                <Textarea
                    id="official_rules"
                    value={(data.official_rules as string) ?? ''}
                    onChange={(e) => setData('official_rules', e.target.value)}
                    rows={8}
                    placeholder="Full official rules text…"
                />
                {errors.official_rules ? <p className="text-sm text-red-500">{errors.official_rules}</p> : null}
            </div>
        </div>
    );
}
