<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    <meta name="description" content="{{ $description }}">

    {{-- Open Graph / Facebook --}}
    <meta property="og:type" content="website">
    <meta property="og:url" content="{{ $shareUrl }}">
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:description" content="{{ $description }}">
    <meta property="og:image" content="{{ $imageUrl }}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="{{ config('app.name') }}">
    <meta property="og:locale" content="{{ app()->getLocale() }}">

    {{-- Twitter Card --}}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="{{ $shareUrl }}">
    <meta name="twitter:title" content="{{ $title }}">
    <meta name="twitter:description" content="{{ $description }}">
    <meta name="twitter:image" content="{{ $imageUrl }}">
    <meta name="twitter:image:alt" content="{{ $title }}">

    {{-- Redirect to offer page (for users; crawlers use meta above) --}}
    <meta http-equiv="refresh" content="0;url={{ $redirectUrl }}">
    <link rel="canonical" href="{{ $shareUrl }}">
</head>
<body>
    <p>Redirecting to offer…</p>
    <script>window.location.replace("{{ $redirectUrl }}");</script>
</body>
</html>
