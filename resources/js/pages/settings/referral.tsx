import { Head, usePage } from '@inertiajs/react';
import { Button } from '@/components/frontend/ui/button';
import SettingsLayout from '@/layouts/settings/layout';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

type ReferralPageProps = {
  referral_code: string;
  is_organization_referral?: boolean;
  supporter_referral_url?: string | null;
  organization_name?: string | null;
};

export default function ReferralLinkPage() {
  const {
    referral_code,
    is_organization_referral = false,
    supporter_referral_url,
    organization_name,
  } = usePage().props as ReferralPageProps;
  const [copied, setCopied] = useState(false);
  const referralUrl =
    is_organization_referral && supporter_referral_url
      ? supporter_referral_url
      : `${window.location.origin}/register?ref=${referral_code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SettingsLayout activeTab="referral">
      <Head title="Referral Link" />
      <div className="max-w-xl mx-auto bg-white dark:bg-transparent rounded-lg shadow p-6 border-1 border-gray-800">
        <h2 className="text-2xl font-bold mb-4">
          {is_organization_referral ? 'Supporter referral link' : 'Share Your Referral Link'}
        </h2>
        <div className="flex items-center gap-2 mb-4">
          <Input
            type="text"
            value={referralUrl}
            readOnly
            className="flex-1 px-3 py-2 border rounded bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          />
          <Button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</Button>
        </div>
        {is_organization_referral ? (
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Share this link so new supporters register with{' '}
            <strong>{organization_name ?? 'your organization'}</strong> as their locked primary organization.
            They can still change later with a reason (you will be notified).
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Invite friends using your referral link. When they register, you&apos;ll both receive rewards!
          </p>
        )}
      </div>
    </SettingsLayout>
  );
}
