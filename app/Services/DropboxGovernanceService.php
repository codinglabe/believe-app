<?php

namespace App\Services;

use App\Data\GovernanceFolderStructure;
use App\Models\Organization;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class DropboxGovernanceService
{
    public function __construct(
        private readonly DropboxOAuthService $dropboxOAuth,
    ) {}

    public function rootPath(): string
    {
        return GovernanceFolderStructure::rootPath();
    }

    /**
     * Create the full Governance folder tree in Dropbox (idempotent).
     *
     * @return array{created: int, failed: int}
     */
    public function provisionFolders(Organization $organization, ?string $accessToken = null): array
    {
        $token = $accessToken ?? $this->dropboxOAuth->getAccessTokenForOrganization($organization);
        if (! $token) {
            return ['created' => 0, 'failed' => 0];
        }

        $api = new DropboxOrgApi($token);
        $created = 0;
        $failed = 0;

        foreach (GovernanceFolderStructure::allPaths() as $path) {
            $existed = $api->folderExists($path);
            if ($api->createFolder($path)) {
                if (! $existed) {
                    $created++;
                }
            } else {
                $failed++;
                Log::warning('Governance folder provision failed', [
                    'organization_id' => $organization->id,
                    'path' => $path,
                ]);
            }
        }

        if ($failed === 0) {
            $this->markProvisioned($organization);
        }

        return ['created' => $created, 'failed' => $failed];
    }

    public function isProvisioned(Organization $organization): bool
    {
        if (! $this->provisionedColumnExists()) {
            return false;
        }

        return $organization->dropbox_governance_provisioned_at !== null;
    }

    /**
     * True only when governance folders exist in Dropbox (DB flag or live check).
     */
    public function resolveProvisioned(Organization $organization, ?DropboxOrgApi $api = null): bool
    {
        if ($this->isProvisioned($organization)) {
            return true;
        }

        if (! $this->isDropboxConnected($organization)) {
            return false;
        }

        $api = $api ?? $this->getApiForOrganization($organization);
        if (! $api) {
            return false;
        }

        $root = $this->rootPath();
        $sampleLeaf = $root.'/Bylaws/Current Bylaws';

        if ($api->folderExists($root) && $api->folderExists($sampleLeaf)) {
            $this->markProvisioned($organization);

            return true;
        }

        return false;
    }

    private function provisionedColumnExists(): bool
    {
        return Schema::hasColumn('organizations', 'dropbox_governance_provisioned_at');
    }

    private function markProvisioned(Organization $organization): void
    {
        if (! $this->provisionedColumnExists()) {
            Log::warning('dropbox_governance_provisioned_at column missing — run migrations');

            return;
        }

        $organization->forceFill([
            'dropbox_governance_provisioned_at' => now(),
        ])->save();
    }

    public function isDropboxConnected(Organization $organization): bool
    {
        return ! empty($organization->dropbox_refresh_token);
    }

    public function getApiForOrganization(Organization $organization): ?DropboxOrgApi
    {
        $token = $this->dropboxOAuth->getAccessTokenForOrganization($organization);
        if (! $token) {
            return null;
        }

        return new DropboxOrgApi($token);
    }

    public function validateGovernancePath(string $path): ?string
    {
        $path = GovernanceFolderStructure::normalizePath($path);

        if (! GovernanceFolderStructure::isAllowedPath($path)) {
            return null;
        }

        return $path;
    }

    /**
     * List files in a governance folder (excludes subfolders).
     *
     * @return list<array{name: string, path_display: string, size: int, client_modified: ?string}>
     */
    public function listFiles(DropboxOrgApi $api, string $folderPath): array
    {
        $entries = $api->listFolder($folderPath);
        $files = [];

        foreach ($entries as $entry) {
            if (($entry['tag'] ?? '') !== 'file') {
                continue;
            }
            $files[] = [
                'name' => $entry['name'],
                'path_display' => $entry['path_display'],
                'size' => (int) ($entry['size'] ?? 0),
                'client_modified' => $entry['client_modified'] ?? null,
            ];
        }

        return DropboxOrgApi::sortByModifiedDesc($files);
    }

    /**
     * Search files under the Governance root.
     *
     * @return list<array{name: string, path_display: string, size: int, client_modified: ?string}>
     */
    public function searchFiles(DropboxOrgApi $api, string $query): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        return DropboxOrgApi::sortByModifiedDesc(
            $api->search($this->rootPath(), $query)
        );
    }

    /**
     * Count files sitting directly in each governance folder (not recursive totals).
     *
     * @return array<string, int> path => file count
     */
    public function countDirectFilesPerFolder(DropboxOrgApi $api): array
    {
        $counts = [];
        foreach (GovernanceFolderStructure::allPaths() as $folderPath) {
            $counts[$folderPath] = 0;
        }

        foreach ($api->listFolderRecursive($this->rootPath()) as $entry) {
            if (($entry['tag'] ?? '') !== 'file') {
                continue;
            }

            $path = $entry['path_display'] ?? '';
            if ($path === '') {
                continue;
            }

            $parent = dirname($path);
            $parent = GovernanceFolderStructure::normalizePath($parent);

            if (! array_key_exists($parent, $counts)) {
                continue;
            }

            $counts[$parent]++;
        }

        return $counts;
    }
}
