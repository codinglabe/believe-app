<?php

namespace App\Http\Controllers\Organization;

use App\Exports\OrganizationSupporterLedgerExport;
use App\Http\Controllers\Controller;
use App\Services\OrganizationSupporterLedgerService;
use Barryvdh\DomPDF\Facade\Pdf;
use Generator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFacade;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Excel as ExcelWriterType;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrganizationSupportersController extends Controller
{
    public function __construct(
        private readonly OrganizationSupporterLedgerService $ledgerService,
    ) {}

    public function index(Request $request): Response
    {
        $organization = $this->resolveOrganization($request);
        $filters = $this->ledgerService->parseFilters($request);
        $ledger = $this->ledgerService->ledger($organization, $filters, paginate: true);

        return Inertia::render('Organization/Supporters/Index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'ein' => $organization->ein,
            ],
            'filters' => $this->filtersForFrontend($filters),
            'ledger' => $ledger,
            'exportUrls' => [
                'csv' => route('organization.supporters.export', array_merge(['format' => 'csv'], $request->query())),
                'xlsx' => route('organization.supporters.export', array_merge(['format' => 'xlsx'], $request->query())),
                'pdf' => route('organization.supporters.export', array_merge(['format' => 'pdf'], $request->query())),
            ],
        ]);
    }

    public function show(Request $request, int $supporter): Response
    {
        $organization = $this->resolveOrganization($request);
        $detail = $this->ledgerService->supporterDetail($organization, $supporter);

        return Inertia::render('Organization/Supporters/Show', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'ein' => $organization->ein,
            ],
            'supporter' => $detail['row'],
            'timeline' => $detail['timeline'],
            'organizationChanges' => $detail['organization_changes'],
            'actionLinks' => $detail['action_links'],
            'ledgerIndexUrl' => route('organization.supporters.index'),
        ]);
    }

    public function contact(Request $request, int $supporter): Response
    {
        $organization = $this->resolveOrganization($request);
        $detail = $this->ledgerService->supporterDetail($organization, $supporter);

        return Inertia::render('Organization/Supporters/Contact', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'supporter' => [
                'supporter_id' => $detail['row']['supporter_id'],
                'name' => $detail['row']['name'],
                'email' => $detail['row']['email'],
            ],
            'ledgerShowUrl' => route('organization.supporters.show', $supporter),
            'ledgerIndexUrl' => route('organization.supporters.index'),
        ]);
    }

    public function export(Request $request, string $format): StreamedResponse|BinaryFileResponse|\Illuminate\Http\Response
    {
        $organization = $this->resolveOrganization($request);
        $filters = $this->ledgerService->parseFilters($request);
        $ledger = $this->ledgerService->ledger($organization, $filters, paginate: false);
        $filenameBase = 'supporter-ledger-'.now()->format('Y-m-d-His');

        if ($format === 'csv') {
            return ResponseFacade::stream(function () use ($ledger) {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, OrganizationSupporterLedgerService::HEADERS);

                foreach ($ledger['rows'] as $row) {
                    fputcsv($handle, $this->ledgerService->rowToExportArray($row));
                }

                fclose($handle);
            }, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$filenameBase.'.csv"',
            ]);
        }

        if ($format === 'xlsx') {
            if ($request->header('X-Inertia')) {
                return Inertia::location($request->fullUrl());
            }

            $rows = $this->exportGenerator($ledger['rows']);

            return Excel::download(
                new OrganizationSupporterLedgerExport($rows),
                $filenameBase.'.xlsx',
                ExcelWriterType::XLSX,
            );
        }

        if ($format === 'pdf') {
            if ($request->header('X-Inertia')) {
                return Inertia::location($request->fullUrl());
            }

            $exportRows = array_map(
                fn (array $row) => $this->ledgerService->rowToExportArray($row),
                $ledger['rows'],
            );

            $pdf = Pdf::loadView('exports.organization-supporter-ledger', [
                'organizationName' => $organization->name,
                'organizationEin' => $organization->ein,
                'generatedAt' => now()->format('M j, Y g:i A'),
                'headers' => OrganizationSupporterLedgerService::HEADERS,
                'rows' => $exportRows,
            ])->setPaper('a4', 'landscape');

            return $pdf->download($filenameBase.'.pdf');
        }

        abort(404);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return Generator<int, list<string|int|float>>
     */
    private function exportGenerator(array $rows): Generator
    {
        foreach ($rows as $row) {
            yield $this->ledgerService->rowToExportArray($row);
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function filtersForFrontend(array $filters): array
    {
        return [
            'membership' => $filters['membership'],
            'join_type' => $filters['join_type'],
            'q' => $filters['search'],
            'date_from' => $filters['date_from']?->format('Y-m-d') ?? '',
            'date_to' => $filters['date_to']?->format('Y-m-d') ?? '',
            'min_donation' => $filters['min_donation'] !== null ? (string) $filters['min_donation'] : '',
            'max_donation' => $filters['max_donation'] !== null ? (string) $filters['max_donation'] : '',
            'min_purchases' => $filters['min_purchases'] !== null ? (string) $filters['min_purchases'] : '',
            'max_purchases' => $filters['max_purchases'] !== null ? (string) $filters['max_purchases'] : '',
            'per_page' => $filters['per_page'],
            'page' => $filters['page'],
        ];
    }

    private function resolveOrganization(Request $request): \App\Models\Organization
    {
        $user = $request->user();
        $organization = $user->organization;

        if ($organization === null || (int) $organization->user_id !== (int) $user->id) {
            abort(403, 'Unauthorized');
        }

        return $organization;
    }
}
