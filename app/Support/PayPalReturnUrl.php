<?php

namespace App\Support;

use Illuminate\Support\Facades\URL;

class PayPalReturnUrl
{
    /**
     * Build an absolute URL for PayPal return/cancel links using the current request host
     * so local domains like bapp.test work even when APP_URL differs.
     */
    public static function absolute(string $routeName, array $parameters = []): string
    {
        $path = route($routeName, $parameters, absolute: false);

        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            return URL::to($path);
        }

        $host = request()->getSchemeAndHttpHost();
        if ($host !== '') {
            return $host.$path;
        }

        return URL::to($path);
    }
}
