param(
  [Parameter(Mandatory=$true)][string]$ExtensionId,
  [Parameter(Mandatory=$true)][string]$HostDirectory,
  [switch]$Edge
)

$ErrorActionPreference = "Stop"
$manifestPath = Join-Path $HostDirectory "com.sentinel.local_auditor.json"
$launcherPath = Join-Path $HostDirectory "launcher.cmd"
$manifest = @{
  name = "com.sentinel.local_auditor"
  description = "SENTINEL read-only local endpoint posture host"
  path = $launcherPath
  type = "stdio"
  allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 4

New-Item -ItemType Directory -Force -Path $HostDirectory | Out-Null
Set-Content -Encoding UTF8 -Path $manifestPath -Value $manifest
$browserRoot = if ($Edge) { "HKLM:\Software\Microsoft\Edge\NativeMessagingHosts" } else { "HKLM:\Software\Google\Chrome\NativeMessagingHosts" }
New-Item -Path $browserRoot -Force | Out-Null
New-Item -Path (Join-Path $browserRoot "com.sentinel.local_auditor") -Force | Out-Null
Set-ItemProperty -Path (Join-Path $browserRoot "com.sentinel.local_auditor") -Name "(Default)" -Value $manifestPath
Write-Host "Registered SENTINEL native host for $browserRoot"
