<?php

namespace App\Services;

/**
 * Post-processes AI-generated newsletter HTML when the model violates contrast rules
 * (e.g. white text on cream/white, or dark slate text on dark purple).
 */
final class NewsletterAiHtmlSanitizer
{
    public function fixContrastIssues(string $html): string
    {
        $html = trim($html);
        if ($html === '') {
            return $html;
        }

        $charset = '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
        $wrapped = '<!DOCTYPE html><html><head>'.$charset.'</head><body><div id="ai-h-root">'.$html.'</div></body></html>';

        libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
        $loaded = @$doc->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();

        if (! $loaded) {
            return $this->regexFallbackLightText($html);
        }

        $xpath = new \DOMXPath($doc);
        foreach ($xpath->query('//*[@style]') as $n) {
            if ($n instanceof \DOMElement) {
                $this->stripUnsafeEmailLayoutStyles($n);
                $this->fixElementContrast($n);
            }
        }

        // Inherited color: e.g. table { color:#fff } + td { background:#fffbeb } → body text invisible on cream
        foreach ($xpath->query('//p|//li|//span|//div|//td|//th|//a|//strong|//h1|//h2|//h3|//h4|//h5|//h6') as $n) {
            if (! ($n instanceof \DOMElement)) {
                continue;
            }
            $this->fixInheritedLightTextOnLightBackground($n);
        }

        // Default dark text on dark header bands when the model omitted inline color
        foreach ($xpath->query(
            '//p|//h1|//h2|//h3|//h4|//h5|//h6|//li|//td|//th|//span|//a|//strong'
        ) as $n) {
            if ($n instanceof \DOMElement) {
                $this->ensureLightTextOnDarkBackground($n);
            }
        }

        // Innermost body cells only (no nested td with the same block content) — add breathing room + rounding when the model skimps.
        foreach ($xpath->query('//td[.//p or .//h1 or .//h2 or .//h3][not(.//td[.//p or .//h1 or .//h2 or .//h3])]') as $n) {
            if ($n instanceof \DOMElement) {
                $this->ensureLightPanelPaddingAndRounding($n);
            }
        }

        $root = $doc->getElementById('ai-h-root');
        if (! $root) {
            return $this->regexFallbackLightText($html);
        }

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    /**
     * Replace every class token with a namespaced unique name (stable mapping per document) so AI templates
     * never reuse generic class names like "header" or "btn" across generations.
     */
    public function uniqueifyHtmlClassNames(string $html): string
    {
        $html = trim($html);
        if ($html === '') {
            return $html;
        }

        $charset = '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
        $wrapped = '<!DOCTYPE html><html><head>'.$charset.'</head><body><div id="ai-h-root">'.$html.'</div></body></html>';

        libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
        $loaded = @$doc->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();

        if (! $loaded) {
            return $html;
        }

        $xpath = new \DOMXPath($doc);
        $nodes = [];
        foreach ($xpath->query('//*[@class]') as $n) {
            if ($n instanceof \DOMElement) {
                $nodes[] = $n;
            }
        }

        $namespace = 'nl'.bin2hex(random_bytes(4));
        $tokenMap = [];
        $next = 0;

        foreach ($nodes as $el) {
            $raw = $el->getAttribute('class');
            foreach (preg_split('/\s+/u', trim($raw), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $tok) {
                if (! array_key_exists($tok, $tokenMap)) {
                    $tokenMap[$tok] = $namespace.'u'.str_pad((string) $next++, 4, '0', STR_PAD_LEFT);
                }
            }
        }

        foreach ($nodes as $el) {
            $raw = $el->getAttribute('class');
            $out = [];
            foreach (preg_split('/\s+/u', trim($raw), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $tok) {
                if (isset($tokenMap[$tok])) {
                    $out[] = $tokenMap[$tok];
                }
            }
            $out = array_values(array_unique($out));
            if ($out === []) {
                $el->removeAttribute('class');
            } else {
                $el->setAttribute('class', implode(' ', $out));
            }
        }

        $root = $doc->getElementById('ai-h-root');
        if (! $root) {
            return $html;
        }

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    /**
     * On light article panels, enforce minimum padding and rounded corners when missing or too tight (AI often returns flat cramped blocks).
     */
    private function ensureLightPanelPaddingAndRounding(\DOMElement $td): void
    {
        $textLen = strlen(trim((string) $td->textContent));
        if ($textLen < 40) {
            return;
        }

        $effectiveBg = $this->resolveEffectiveBackground($td);
        if ($effectiveBg !== null && $this->isDarkBackgroundColor($effectiveBg)) {
            return;
        }

        $style = $td->getAttribute('style');
        $props = $style === '' ? [] : $this->parseInlineStyle($style);
        $changed = false;

        if ($this->shouldBoostPadding($props)) {
            $props['padding'] = '24px';
            $changed = true;
        }

        $br = isset($props['border-radius']) ? strtolower(trim((string) $props['border-radius'])) : '';
        if ($br === '' || $br === '0' || $br === '0px' || $this->minPxFromCssLength($br) < 6.0) {
            $props['border-radius'] = '10px';
            $changed = true;
        }

        if (! $changed) {
            return;
        }

        $td->setAttribute('style', $this->serializeInlineStyle($props));
    }

    /**
     * @param  array<string, string>  $props
     */
    private function shouldBoostPadding(array $props): bool
    {
        foreach (['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'] as $k) {
            if (isset($props[$k]) && trim((string) $props[$k]) !== '') {
                $min = $this->minPaddingPxFromProps($props);
                if ($min !== null && $min >= 16.0) {
                    return false;
                }
                if ($min !== null && $min < 16.0) {
                    return true;
                }

                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, string>  $props
     */
    private function minPaddingPxFromProps(array $props): ?float
    {
        if (isset($props['padding'])) {
            return $this->minPxFromPaddingShorthand((string) $props['padding']);
        }
        $mins = [];
        foreach (['padding-top', 'padding-right', 'padding-bottom', 'padding-left'] as $k) {
            if (isset($props[$k])) {
                $m = $this->minPxFromCssLength((string) $props[$k]);
                if ($m !== null) {
                    $mins[] = $m;
                }
            }
        }

        if ($mins === []) {
            return null;
        }

        return min($mins);
    }

    private function minPxFromPaddingShorthand(string $padding): ?float
    {
        $parts = preg_split('/\s+/', trim($padding)) ?: [];
        $values = [];
        foreach ($parts as $part) {
            $m = $this->minPxFromCssLength($part);
            if ($m !== null) {
                $values[] = $m;
            }
        }

        if ($values === []) {
            return null;
        }

        return min($values);
    }

    private function minPxFromCssLength(string $value): ?float
    {
        $v = strtolower(trim($value));
        if (preg_match('/([\d.]+)\s*px/i', $v, $m)) {
            return (float) $m[1];
        }

        return null;
    }

    /**
     * Strip CSS that breaks Outlook / many webmail clients or causes “newspaper” multi-column body text.
     * (Industry practice: table-based layout + inline styles only — see Mailchimp / Campaign Monitor HTML guides.)
     */
    private function stripUnsafeEmailLayoutStyles(\DOMElement $el): void
    {
        $style = $el->getAttribute('style');
        if ($style === '') {
            return;
        }
        $props = $this->parseInlineStyle($style);
        $changed = false;
        foreach (array_keys($props) as $k) {
            $kl = strtolower($k);
            if ($kl === 'column-count' || $kl === 'columns' || str_ends_with($kl, 'column-count')) {
                unset($props[$k]);
                $changed = true;

                continue;
            }
            if ($kl === 'float' || $kl === 'clear') {
                unset($props[$k]);
                $changed = true;

                continue;
            }
            if ($kl === 'display') {
                $v = strtolower(trim((string) $props[$k]));
                if (str_contains($v, 'flex') || str_contains($v, 'grid')) {
                    unset($props[$k]);
                    $changed = true;
                }
            }
            if (str_starts_with($kl, 'flex') || str_starts_with($kl, 'grid') || $kl === 'gap' || $kl === 'row-gap' || $kl === 'column-gap') {
                unset($props[$k]);
                $changed = true;
            }
        }
        if (! $changed) {
            return;
        }
        if (count($props) === 0) {
            $el->removeAttribute('style');

            return;
        }
        $el->setAttribute('style', $this->serializeInlineStyle($props));
    }

    /**
     * If an element has no explicit text color but sits on a dark background, force light text (fixes black-on-purple headers).
     */
    private function ensureLightTextOnDarkBackground(\DOMElement $el): void
    {
        $own = $this->parseInlineStyle($el->getAttribute('style'));
        if (isset($own['color']) && trim((string) $own['color']) !== '') {
            return;
        }
        $effectiveBg = $this->resolveEffectiveBackground($el);
        if ($effectiveBg === null || ! $this->isDarkBackgroundColor($effectiveBg)) {
            return;
        }
        $own['color'] = '#f8fafc';
        $el->setAttribute('style', $this->serializeInlineStyle($own));
    }

    private function fixElementContrast(\DOMElement $el): void
    {
        $style = $el->getAttribute('style');
        if ($style === '') {
            return;
        }

        $props = $this->parseInlineStyle($style);
        $color = isset($props['color']) ? trim((string) $props['color']) : null;
        if ($color === null || $color === '') {
            return;
        }

        $effectiveBg = $this->resolveEffectiveBackground($el);
        $onLightPanel = $effectiveBg === null || $this->isLightBackgroundColor($effectiveBg);

        // Any pale / light-gray / off-white text on a light panel → solid dark body color
        if ($onLightPanel && $this->shouldForceDarkTextOnLightBackground($color)) {
            $props['color'] = '#0f172a';
            $el->setAttribute('style', $this->serializeInlineStyle($props));

            return;
        }

        // Dark slate body text on dark header/footer background → light text
        if ($this->isDarkTextColor($color) && $effectiveBg !== null && $this->isDarkBackgroundColor($effectiveBg)) {
            $props['color'] = '#f8fafc';
            $el->setAttribute('style', $this->serializeInlineStyle($props));
        }
    }

    private function fixInheritedLightTextOnLightBackground(\DOMElement $el): void
    {
        $own = $this->parseInlineStyle($el->getAttribute('style'));
        if (isset($own['color']) && trim((string) $own['color']) !== '') {
            return;
        }

        $inherited = $this->resolveInheritedColorFromAncestors($el);
        if ($inherited === null) {
            return;
        }
        if (! $this->shouldForceDarkTextOnLightBackground($inherited)) {
            return;
        }

        $effectiveBg = $this->resolveEffectiveBackground($el);
        if ($effectiveBg === null || $this->isLightBackgroundColor($effectiveBg)) {
            $own['color'] = '#0f172a';
            $el->setAttribute('style', $this->serializeInlineStyle($own));
        }
    }

    private function resolveInheritedColorFromAncestors(\DOMElement $node): ?string
    {
        $el = $node->parentNode;
        for ($i = 0; $el && $i < 18; $i++) {
            if (! ($el instanceof \DOMElement)) {
                break;
            }
            $st = $el->getAttribute('style');
            if ($st !== '') {
                $p = $this->parseInlineStyle($st);
                if (! empty($p['color'])) {
                    return trim((string) $p['color']);
                }
            }
            $el = $el->parentNode instanceof \DOMElement ? $el->parentNode : null;
        }

        return null;
    }

    private function resolveEffectiveBackground(\DOMElement $node): ?string
    {
        $el = $node;
        for ($i = 0; $el && $i < 16; $i++) {
            if (! ($el instanceof \DOMElement)) {
                break;
            }
            if ($el->hasAttribute('bgcolor')) {
                $bg = trim((string) $el->getAttribute('bgcolor'));
                if ($bg !== '') {
                    return $bg;
                }
            }
            $st = $el->getAttribute('style');
            if ($st !== '') {
                $p = $this->parseInlineStyle($st);
                if (! empty($p['background-color'])) {
                    return trim((string) $p['background-color']);
                }
                if (! empty($p['background'])) {
                    $c = $this->extractColorFromBackgroundValue((string) $p['background']);
                    if ($c !== null) {
                        return $c;
                    }
                }
            }
            $parent = $el->parentNode;
            $el = $parent instanceof \DOMElement ? $parent : null;
        }

        return null;
    }

    /**
     * True when text would read as pale / white / light gray on a light panel (AI often uses #e5e7eb, #cbd5e1, #94a3b8 on white).
     * Saturated accent colors (blues, reds) are left alone unless nearly white.
     */
    private function shouldForceDarkTextOnLightBackground(string $color): bool
    {
        if ($this->isVeryLightTextColor($color)) {
            return true;
        }
        $rgb = $this->colorToRgb($color);
        if ($rgb === null) {
            return false;
        }
        $l = $this->relativeLuminance($rgb);
        if ($l <= 0.22) {
            return false;
        }
        $max = max($rgb[0], $rgb[1], $rgb[2]);
        $min = min($rgb[0], $rgb[1], $rgb[2]);
        $chroma = $max - $min;
        $nearNeutral = $chroma <= 52.0;

        return $nearNeutral && $l > 0.22;
    }

    /**
     * @return array<string, string>
     */
    private function parseInlineStyle(string $style): array
    {
        $out = [];
        foreach (explode(';', $style) as $chunk) {
            $chunk = trim($chunk);
            if ($chunk === '') {
                continue;
            }
            $pos = strpos($chunk, ':');
            if ($pos === false) {
                continue;
            }
            $k = strtolower(trim(substr($chunk, 0, $pos)));
            $v = trim(substr($chunk, $pos + 1));
            if ($k !== '') {
                $out[$k] = $v;
            }
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $props
     */
    private function serializeInlineStyle(array $props): string
    {
        $parts = [];
        foreach ($props as $k => $v) {
            $parts[] = $k.': '.$v;
        }

        return implode('; ', $parts);
    }

    private function extractColorFromBackgroundValue(string $bg): ?string
    {
        if (preg_match('/linear-gradient|url\(/i', $bg)) {
            return null;
        }
        if (preg_match('/#([0-9a-f]{3,8})\b/i', $bg, $m)) {
            return '#'.$m[1];
        }
        if (preg_match('/rgba?\([^)]+\)/i', $bg, $m)) {
            return $m[0];
        }

        return null;
    }

    private function isVeryLightTextColor(string $color): bool
    {
        $c = strtolower(trim($color));
        if (in_array($c, ['white', '#fff', '#ffffff'], true)) {
            return true;
        }
        $rgb = $this->colorToRgb($c);
        if ($rgb === null) {
            return false;
        }

        return $this->relativeLuminance($rgb) > 0.82;
    }

    private function isDarkTextColor(string $color): bool
    {
        $rgb = $this->colorToRgb($color);
        if ($rgb === null) {
            return false;
        }

        return $this->relativeLuminance($rgb) < 0.22;
    }

    private function isLightBackgroundColor(string $color): bool
    {
        $c = strtolower(trim($color));
        if (str_contains($c, 'gradient')) {
            return false;
        }
        $rgb = $this->colorToRgb($c);
        if ($rgb === null) {
            return true;
        }

        return $this->relativeLuminance($rgb) > 0.65;
    }

    private function isDarkBackgroundColor(string $color): bool
    {
        $c = strtolower(trim($color));
        if (str_contains($c, 'gradient')) {
            return false;
        }
        $rgb = $this->colorToRgb($color);
        if ($rgb === null) {
            return false;
        }

        return $this->relativeLuminance($rgb) < 0.28;
    }

    /**
     * @return array{0: float, 1: float, 2: float}|null
     */
    private function colorToRgb(string $color): ?array
    {
        $c = strtolower(trim($color));
        if ($c === 'black') {
            return [0.0, 0.0, 0.0];
        }
        if ($c === 'white') {
            return [255.0, 255.0, 255.0];
        }
        if (preg_match('/^#([0-9a-f]{3})$/i', $c, $m)) {
            $h = $m[1];

            return [
                hexdec(str_repeat($h[0], 2)),
                hexdec(str_repeat($h[1], 2)),
                hexdec(str_repeat($h[2], 2)),
            ];
        }
        if (preg_match('/^#([0-9a-f]{6})$/i', $c, $m)) {
            $h = $m[1];

            return [
                hexdec(substr($h, 0, 2)),
                hexdec(substr($h, 2, 2)),
                hexdec(substr($h, 4, 2)),
            ];
        }
        if (preg_match('/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i', $c, $m)) {
            return [(float) $m[1], (float) $m[2], (float) $m[3]];
        }

        return null;
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $rgb
     */
    private function relativeLuminance(array $rgb): float
    {
        $sr = $rgb[0] / 255;
        $sg = $rgb[1] / 255;
        $sb = $rgb[2] / 255;

        return (0.2126 * $sr) + (0.7152 * $sg) + (0.0722 * $sb);
    }

    private function regexFallbackLightText(string $html): string
    {
        // When DOM parsing fails: fix obvious white-on-light in same style attribute
        return (string) preg_replace_callback(
            '/style\s*=\s*("|\')([^"\']*)\1/i',
            function (array $m): string {
                $q = $m[1];
                $st = $m[2];
                $lower = strtolower($st);
                if (! preg_match('/color\s*:\s*(#[fF]{3,6}|white|rgb\(\s*255\s*,\s*255\s*,\s*255)/', $lower)) {
                    return 'style='.$q.$st.$q;
                }
                if (! preg_match('/background(?:-color)?\s*:\s*[^;]*(#[fF]{2}[eEfF][bB]{2}|#fff|#ffffff|fffbeb|fff7ed|f8fafc|f1f5f9|fefefe)/i', $lower)
                    && ! preg_match('/background(?:-color)?\s*:\s*[^;]*(rgb\(\s*25[0-5])/', $lower)) {
                    return 'style='.$q.$st.$q;
                }
                $st = preg_replace('/color\s*:\s*[^;]+/i', 'color: #0f172a', $st, 1) ?? $st;

                return 'style='.$q.$st.$q;
            },
            $html
        );
    }
}
