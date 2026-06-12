# Generate (if needed) and configure local SSH access to Believe VPS.
# Run from PowerShell:  .\scripts\setup-local-ssh.ps1
# Requires: OpenSSH client (ssh-keygen, ssh) — built into Windows 10+.

$ErrorActionPreference = "Stop"

$VpsHost = "72.60.226.88"
$SshDir = Join-Path $env:USERPROFILE ".ssh"
$KeyPath = Join-Path $SshDir "believe_wallet_local_ed25519"
$ConfigPath = Join-Path $SshDir "config"
$ConfigMarker = "# --- believe-wallet VPS (local) ---"

New-Item -ItemType Directory -Force -Path $SshDir | Out-Null

if (-not (Test-Path $KeyPath)) {
    Write-Host "Creating SSH key: $KeyPath"
    ssh-keygen -t ed25519 -f $KeyPath -N '""' -C "believe-wallet-local@$env:USERNAME"
} else {
    Write-Host "SSH key already exists: $KeyPath"
}

$pubKey = Get-Content "$KeyPath.pub" -Raw
$pubKey = $pubKey.Trim()

$block = @"

$ConfigMarker
Host believe-vps
    HostName $VpsHost
    User root
    IdentityFile $KeyPath
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

Host believe-prod
    HostName $VpsHost
    User believeinunity
    IdentityFile $KeyPath
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

Host believe-relay
    HostName $VpsHost
    User believeinunity
    IdentityFile $KeyPath
    IdentitiesOnly yes
    StrictHostKeyChecking accept-new

Host believe-dev
    HostName 127.0.0.1
    User c3ers
    IdentityFile $KeyPath
    IdentitiesOnly yes
    ProxyCommand ssh -W 127.0.0.1:22 believe-relay
    StrictHostKeyChecking accept-new
"@

if (Test-Path $ConfigPath) {
    $existing = Get-Content $ConfigPath -Raw
    if ($existing -match [regex]::Escape($ConfigMarker)) {
        $existing = ($existing -split [regex]::Escape($ConfigMarker))[0].TrimEnd()
    }
    Set-Content -Path $ConfigPath -Value ($existing + "`n" + $block + "`n") -NoNewline
} else {
    Set-Content -Path $ConfigPath -Value ($block + "`n") -NoNewline
}

icacls $SshDir /inheritance:r /grant:r "$env:USERNAME`:F" | Out-Null
icacls $KeyPath /inheritance:r /grant:r "$env:USERNAME`:R" | Out-Null

Write-Host ""
Write-Host "Local SSH key ready."
Write-Host "  Private: $KeyPath"
Write-Host "  Public:  $KeyPath.pub"
Write-Host ""
Write-Host "SSH hosts configured in $ConfigPath :"
Write-Host "  believe-vps   -> root@$VpsHost"
Write-Host "  believe-prod  -> believeinunity@$VpsHost  (believeinunity.org)"
Write-Host "  believe-dev   -> c3ers@127.0.0.1 via relay (501c3ers.com)"
Write-Host ""
Write-Host "NEXT: install the public key on the VPS (one time, as root):"
Write-Host ""
Write-Host "  ssh root@$VpsHost"
Write-Host "  bash /home/c3ers/public_html/scripts/install-local-ssh-key-on-vps.sh"
Write-Host ""
Write-Host "Or paste this public key manually in WHM -> Manage root SSH Keys:"
Write-Host ""
Write-Host $pubKey
Write-Host ""
Write-Host "After install, test:"
Write-Host "  ssh believe-vps   whoami"
Write-Host "  ssh believe-prod  whoami"
Write-Host "  ssh believe-dev   whoami"
