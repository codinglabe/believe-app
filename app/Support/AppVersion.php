<?php

namespace App\Support;

final class AppVersion
{
    /**
     * Deploy/build identifier used for PWA update checks and Inertia asset versioning.
     */
    public static function current(): string
    {
        $env = env('APP_VERSION');
        if (is_string($env) && $env !== '') {
            return $env;
        }

        $stamped = public_path('pwa/version.json');
        if (is_file($stamped)) {
            $json = json_decode((string) file_get_contents($stamped), true);
            if (is_array($json) && ! empty($json['version']) && is_string($json['version'])) {
                return $json['version'];
            }
        }

        $manifestPath = public_path('build/manifest.json');
        if (is_file($manifestPath)) {
            return substr(hash_file('xxh128', $manifestPath), 0, 16);
        }

        return app()->environment('production') ? '1.0.0' : 'dev';
    }

    public static function builtAt(): ?string
    {
        $stamped = public_path('pwa/version.json');
        if (is_file($stamped)) {
            $json = json_decode((string) file_get_contents($stamped), true);
            if (is_array($json) && ! empty($json['builtAt']) && is_string($json['builtAt'])) {
                return $json['builtAt'];
            }
        }

        $manifestPath = public_path('build/manifest.json');
        if (is_file($manifestPath)) {
            return gmdate('c', (int) filemtime($manifestPath));
        }

        return null;
    }
}
