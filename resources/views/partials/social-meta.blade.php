@php
    /** @var array<string, mixed> $page */
    $og = \App\Services\SeoService::openGraphForView($page ?? [], request());
@endphp
<meta name="description" content="{{ $og['description'] }}">
<link rel="canonical" href="{{ $og['url'] }}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{{ $og['site_name'] }}">
<meta property="og:title" content="{{ $og['og_title'] }}">
<meta property="og:description" content="{{ $og['description'] }}">
<meta property="og:url" content="{{ $og['url'] }}">
<meta property="og:locale" content="{{ str_replace('_', '-', app()->getLocale()) }}">
@if(!empty($og['share_image']))
<meta property="og:image" content="{{ $og['share_image'] }}">
<meta property="og:image:secure_url" content="{{ $og['share_image'] }}">
<meta property="og:image:type" content="{{ $og['image_type'] }}">
<meta property="og:image:width" content="{{ $og['image_width'] }}">
<meta property="og:image:height" content="{{ $og['image_height'] }}">
<meta property="og:image:alt" content="{{ $og['og_title'] }}">
@endif
<meta name="twitter:card" content="{{ !empty($og['share_image']) ? 'summary_large_image' : 'summary' }}">
<meta name="twitter:title" content="{{ $og['og_title'] }}">
<meta name="twitter:description" content="{{ $og['description'] }}">
@if(!empty($og['share_image']))
<meta name="twitter:image" content="{{ $og['share_image'] }}">
<meta name="twitter:image:alt" content="{{ $og['og_title'] }}">
@endif
@if(!empty($og['json_ld']))
<script type="application/ld+json">{!! json_encode($og['json_ld'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) !!}</script>
@endif
