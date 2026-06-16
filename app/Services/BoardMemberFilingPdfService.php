<?php

namespace App\Services;

use App\Models\Organization;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class BoardMemberFilingPdfService
{
    /**
     * @return array<string, mixed>
     */
    public function buildViewData(Organization $organization, bool $activeOnly = true): array
    {
        $query = $organization->boardMembers()->with('user')->orderBy('position')->orderBy('id');

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        /** @var Collection<int, \App\Models\BoardMember> $members */
        $members = $query->get();

        $signer = is_array($organization->authorized_signer_info) ? $organization->authorized_signer_info : [];

        return [
            'organizationName' => $organization->name,
            'organizationEin' => $organization->formatted_ein ?? $organization->ein,
            'organizationAddress' => $this->formatAddress($organization),
            'organizationPhone' => $organization->phone,
            'organizationEmail' => $organization->email ?? $organization->platform_email,
            'generatedAt' => now()->format('F j, Y'),
            'activeOnly' => $activeOnly,
            'members' => $members->map(fn ($member) => [
                'name' => $member->user?->name ?? '—',
                'title' => $member->position ?: 'Director',
                'email' => $member->user?->email ?? '—',
                'status' => $member->is_active ? 'Active' : 'Inactive',
                'appointed_on' => $member->appointed_on?->format('m/d/Y') ?? '—',
                'compensation' => 'None',
                'hours_per_week' => 'As needed',
            ])->values()->all(),
            'authorizedSignerName' => trim((string) ($signer['full_name'] ?? '')),
            'authorizedSignerTitle' => trim((string) ($signer['title'] ?? '')),
        ];
    }

    public function download(Organization $organization, bool $activeOnly = true): Response
    {
        $data = $this->buildViewData($organization, $activeOnly);
        $slug = str($organization->name)->slug()->limit(40, '')->toString() ?: 'organization';
        $filename = 'board-member-list-501c3-'.$slug.'-'.now()->format('Y-m-d').'.pdf';

        $pdf = Pdf::loadView('exports.board-member-list-501c3', $data)
            ->setPaper('letter', 'portrait');

        return $pdf->download($filename);
    }

    private function formatAddress(Organization $organization): ?string
    {
        $parts = array_filter([
            $organization->street,
            $organization->city,
            $organization->state,
            $organization->zip,
        ], fn ($part) => filled($part));

        return $parts !== [] ? implode(', ', $parts) : null;
    }
}
