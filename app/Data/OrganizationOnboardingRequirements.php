<?php

namespace App\Data;

/**
 * Required organization onboarding checklist (documents → Governance Storage folders).
 */
class OrganizationOnboardingRequirements
{
    public const ARTICLES_OF_INCORPORATION = 'articles_of_incorporation';

    public const IRS_DETERMINATION_LETTER = 'irs_determination_letter';

    public const EIN_LETTER = 'ein_letter';

    public const BOARD_MEMBER_LIST = 'board_member_list';

    /** Active board members required beyond the registrant auto-added at signup. */
    public const MINIMUM_ACTIVE_BOARD_MEMBERS = 2;

    public const AUTHORIZED_SIGNER = 'authorized_signer';

    public const BANK_VERIFICATION = 'bank_verification';

    public const GOVERNMENT_ID_SIGNER = 'government_id_signer';

    /**
     * @return list<array{
     *     id: string,
     *     label: string,
     *     description: string,
     *     type: 'upload'|'form'|'board_members',
     *     storage_path: string|null,
     *     route: string
     * }>
     */
    public static function all(): array
    {
        $onboardingRoute = route('governance.onboarding.index');

        return [
            [
                'id' => self::ARTICLES_OF_INCORPORATION,
                'label' => 'Articles of Incorporation',
                'description' => 'State-filed document that legally creates your nonprofit.',
                'type' => 'upload',
                'storage_path' => '/Governance/Articles of Incorporation/Original Articles',
                'route' => $onboardingRoute.'#'.self::ARTICLES_OF_INCORPORATION,
            ],
            [
                'id' => self::IRS_DETERMINATION_LETTER,
                'label' => 'IRS Determination Letter',
                'description' => 'IRS letter confirming your 501(c)(3) tax-exempt status.',
                'type' => 'upload',
                'storage_path' => '/Governance/IRS & Tax Exemption/IRS Determination Letter',
                'route' => $onboardingRoute.'#'.self::IRS_DETERMINATION_LETTER,
            ],
            [
                'id' => self::EIN_LETTER,
                'label' => 'EIN Letter',
                'description' => 'IRS letter assigning your Employer Identification Number.',
                'type' => 'upload',
                'storage_path' => '/Governance/IRS & Tax Exemption/EIN Letter',
                'route' => $onboardingRoute.'#'.self::EIN_LETTER,
            ],
            [
                'id' => self::BOARD_MEMBER_LIST,
                'label' => 'Board Member List',
                'description' => 'Add your board roster below, generate a 501(c)(3) filing PDF, or upload your board member list document.',
                'type' => 'board_members',
                'storage_path' => '/Governance/Board of Directors/Director Profiles',
                'route' => $onboardingRoute.'#'.self::BOARD_MEMBER_LIST,
            ],
            [
                'id' => self::AUTHORIZED_SIGNER,
                'label' => 'Authorized Signer Information',
                'description' => 'Person legally authorized to sign on behalf of the organization.',
                'type' => 'form',
                'storage_path' => null,
                'route' => $onboardingRoute.'#'.self::AUTHORIZED_SIGNER,
            ],
            [
                'id' => self::BANK_VERIFICATION,
                'label' => 'Bank Verification',
                'description' => 'Voided check, bank letter, or account verification document.',
                'type' => 'upload',
                'storage_path' => '/Governance/Financial Oversight/Treasurer Reports',
                'route' => $onboardingRoute.'#'.self::BANK_VERIFICATION,
            ],
            [
                'id' => self::GOVERNMENT_ID_SIGNER,
                'label' => 'Government ID of Authorized Signer',
                'description' => 'Driver license or passport for the authorized signer.',
                'type' => 'upload',
                'storage_path' => '/Governance/Board of Directors/Director Profiles',
                'route' => $onboardingRoute.'#'.self::GOVERNMENT_ID_SIGNER,
            ],
        ];
    }

    public static function find(string $id): ?array
    {
        foreach (self::all() as $item) {
            if ($item['id'] === $id) {
                return $item;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    public static function uploadDocumentTypes(): array
    {
        return collect(self::all())
            ->where('type', 'upload')
            ->pluck('id')
            ->all();
    }
}
