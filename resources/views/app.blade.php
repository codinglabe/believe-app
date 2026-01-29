<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        @php
            $isLivestock = function_exists('is_livestock_domain') ? is_livestock_domain() : false;
            $isMerchant = request()->getHost() === config('merchant.domain') || str_contains(request()->getHost(), 'merchant.');
        @endphp
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        @unless($isLivestock || $isMerchant)
        <meta name="description" content="{{ config('app.name') }} - Connect with nonprofits and supporters. Donate, volunteer, and make an impact.">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="{{ config('app.name') }}">
        <meta name="twitter:card" content="summary_large_image">
        @endunless

        <!-- PWA Meta Tags -->
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#000000">

        <!-- Icons -->
        <link rel="icon" href="/web-app-manifest-192x192.png">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

         <meta name="mobile-web-app-capable" content="yes">

        <!-- PWA Capabilities -->
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="501c3ers">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <title inertia>@if($isLivestock) Bida Livestock - Premium Livestock Marketplace @elseif($isMerchant) {{ config('app.name', 'Believe') }} Merchant Program @else {{ config('app.name', 'Laravel') }} @endif</title>

        @if($isMerchant)
            <link rel="icon" href="/merchant/merchant.ico" sizes="any">
            <link rel="apple-touch-icon" href="/merchant/merchant.png">
        @elseif($isLivestock)
            <link rel="icon" href="/livestock/fav.ico" sizes="any">
            <link rel="apple-touch-icon" href="/livestock/logo.png">
        @else
            <link rel="icon" href="/favicon.ico" sizes="any">
            <link rel="icon" href="/favicon.svg" type="image/svg+xml">
            <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        @endif



        <Link rel="preconnect" href="https://fonts.bunny.net">
        <Link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
