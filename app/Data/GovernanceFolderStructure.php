<?php

namespace App\Data;

/**
 * Canonical Governance document folder tree provisioned in Dropbox for each organization.
 */
class GovernanceFolderStructure
{
    public const ROOT = 'Governance';

    /**
     * Nested folder tree: key = folder name, value = child folders (array of names or nested arrays).
     *
     * @return array<string, array<string, array<int, string|array<string, array<int, string>>>>>
     */
    public static function tree(): array
    {
        return [
            self::ROOT => [
                'Articles of Incorporation' => [
                    'Original Articles',
                    'Amended Articles',
                    'State Filing Receipts',
                    'Certificates of Amendment',
                    'Historical Versions',
                ],
                'Bylaws' => [
                    'Current Bylaws',
                    'Proposed Amendments',
                    'Approved Amendments',
                    'Board Approval Records',
                    'Historical Versions',
                ],
                'Board of Directors' => [
                    'Director Profiles',
                    'Board Applications',
                    'Appointment Letters',
                    'Officer Appointments',
                    'Board Agreements',
                    'Conflict of Interest Forms',
                    'Ethics Acknowledgements',
                    'Board Training',
                ],
                'Board Meetings' => [
                    'Agendas',
                    'Meeting Minutes',
                    'Attendance Records',
                    'Board Resolutions',
                    'Committee Reports',
                    'Voting Records',
                    'Annual Meetings',
                ],
                'Policies & Procedures' => [
                    'Conflict of Interest Policy',
                    'Whistleblower Policy',
                    'Document Retention Policy',
                    'Gift Acceptance Policy',
                    'Financial Controls Policy',
                    'Volunteer Policy',
                    'Privacy Policy',
                    'Cybersecurity Policy',
                    'Procurement Policy',
                    'Employee Handbook',
                ],
                'IRS & Tax Exemption' => [
                    'IRS Determination Letter',
                    'Form 1023 Application',
                    'Form 1023-EZ Application',
                    'EIN Letter',
                    'IRS Correspondence',
                    'Tax Exemption Certificates',
                    'State Exemption Documents',
                ],
                'Compliance' => [
                    'State Registrations',
                    'Charity Registrations',
                    'Annual Reports',
                    'Secretary of State Filings',
                    'Business Licenses',
                    'Permit Renewals',
                    'Good Standing Certificates',
                    'Regulatory Correspondence',
                ],
                'Financial Oversight' => [
                    'Annual Budgets',
                    'Board Approved Budgets',
                    'Financial Statements',
                    'Treasurer Reports',
                    'Audit Reports',
                    'Internal Reviews',
                    'Investment Policies',
                    'Reserve Fund Reports',
                ],
                'Insurance' => [
                    'General Liability',
                    'Directors & Officers (D&O)',
                    'Cyber Insurance',
                    'Property Insurance',
                    'Workers Compensation',
                    'Certificates of Insurance',
                    'Claims History',
                ],
                'Corporate Records' => [
                    'Certificates of Good Standing',
                    'DBA / Trade Names',
                    'Registered Agent Records',
                    'Corporate Seal',
                    'Organizational Chart',
                    'Strategic Plans',
                    'Historical Records',
                ],
                'Committees' => [
                    'Executive Committee',
                    'Finance Committee',
                    'Audit Committee',
                    'Governance Committee',
                    'Fundraising Committee',
                    'Program Committee',
                ],
                'Elections & Voting' => [
                    'Board Elections',
                    'Ballots',
                    'Election Results',
                    'Member Votes',
                    'Special Resolutions',
                ],
            ],
        ];
    }

    /**
     * Flat list of every folder path (e.g. "/Governance/Bylaws/Current Bylaws").
     *
     * @return list<string>
     */
    public static function allPaths(): array
    {
        $paths = [];
        self::collectPaths(self::tree(), '', $paths);

        return $paths;
    }

    /**
     * Tree formatted for the Storage UI (name + path + optional children).
     *
     * @return list<array{name: string, path: string, children: list<array{name: string, path: string, children: list<mixed>}>}>
     */
    public static function uiTree(): array
    {
        $root = self::tree()[self::ROOT] ?? [];

        return self::buildUiNodes($root, '/'.self::ROOT);
    }

    public static function rootPath(): string
    {
        return '/'.self::ROOT;
    }

    public static function isAllowedPath(string $path): bool
    {
        $path = self::normalizePath($path);
        $root = self::rootPath();

        if ($path !== $root && ! str_starts_with($path, $root.'/')) {
            return false;
        }

        if (str_contains($path, '..')) {
            return false;
        }

        $all = self::allPaths();

        return in_array($path, $all, true);
    }

    public static function normalizePath(string $path): string
    {
        $path = trim($path);
        if ($path === '') {
            return self::rootPath();
        }
        if ($path[0] !== '/') {
            $path = '/'.$path;
        }

        return preg_replace('#/+#', '/', $path) ?: $path;
    }

    /**
     * @param  array<string, mixed>  $nodes
     * @param  list<string>  $paths
     */
    private static function collectPaths(array $nodes, string $parentPath, array &$paths): void
    {
        foreach ($nodes as $name => $children) {
            $path = $parentPath === '' ? '/'.$name : $parentPath.'/'.$name;
            $paths[] = $path;

            if (is_array($children) && $children !== []) {
                $childMap = self::isList($children)
                    ? array_fill_keys($children, [])
                    : $children;
                self::collectPaths($childMap, $path, $paths);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $nodes
     * @return list<array{name: string, path: string, children: list<mixed>}>
     */
    private static function buildUiNodes(array $nodes, string $parentPath): array
    {
        $out = [];

        foreach ($nodes as $name => $children) {
            $path = $parentPath.'/'.$name;
            $childNodes = [];

            if (is_array($children) && $children !== []) {
                $childMap = self::isList($children)
                    ? array_fill_keys($children, [])
                    : $children;
                $childNodes = self::buildUiNodes($childMap, $path);
            }

            $out[] = [
                'name' => (string) $name,
                'path' => $path,
                'children' => $childNodes,
            ];
        }

        return $out;
    }

    /**
     * @param  array<int, mixed>  $arr
     */
    private static function isList(array $arr): bool
    {
        if ($arr === []) {
            return true;
        }

        return array_keys($arr) === range(0, count($arr) - 1);
    }
}
