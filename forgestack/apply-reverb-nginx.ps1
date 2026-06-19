# Re-apply Laravel Reverb nginx proxy for believeinunity.test (ForgeStack).
# Run after ForgeStack regenerates forgestack-sites.conf if /app stops proxying.

$ErrorActionPreference = "Stop"

$sitesConf = Join-Path $env:USERPROFILE ".forgestack\runtimes\nginx\conf\conf.d\forgestack-sites.conf"
$includeLine = '    include "D:/client/mathew/believe-wallet/backend/forgestack/nginx-reverb-locations.conf";'
$marker = "nginx-reverb-locations.conf"

if (-not (Test-Path $sitesConf)) {
    Write-Error "ForgeStack nginx config not found: $sitesConf"
}

$content = Get-Content -Path $sitesConf -Raw

if ($content -match [regex]::Escape($marker)) {
    Write-Host "Reverb nginx include already present."
} else {
    $pattern = '(?m)^(\s*location / \{ try_files \$uri \$uri/ /index\.php\?\$query_string; \}\r?\n)'
    if ($content -notmatch $pattern) {
        Write-Error "Could not find believeinunity.test location / block in forgestack-sites.conf"
    }
    $content = [regex]::Replace($content, $pattern, "`$1$includeLine`r`n", 1)
    Set-Content -Path $sitesConf -Value $content -NoNewline
    Write-Host "Added Reverb nginx include to forgestack-sites.conf"
}

$nginxRoot = Join-Path $env:USERPROFILE ".forgestack\runtimes\nginx"
$nginxExe = Join-Path $nginxRoot "nginx.exe"
if (Test-Path $nginxExe) {
    & $nginxExe -s reload -p $nginxRoot -c "conf\nginx.conf"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "nginx reloaded."
        exit 0
    }
    Write-Host "nginx reload failed (exit $LASTEXITCODE). Restart ForgeStack if needed."
} else {
    Write-Host "nginx.exe not found at $nginxExe — restart ForgeStack to apply changes."
}

Write-Host "Done. Verify: curl.exe -sk -D - https://believeinunity.test/app/test -o NUL | findstr /i server"
