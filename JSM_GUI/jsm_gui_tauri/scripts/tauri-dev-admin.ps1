$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$projectRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = $MyInvocation.MyCommand.Path

if (-not $isAdmin) {
  Start-Process `
    -FilePath "powershell.exe" `
    -Verb RunAs `
    -WorkingDirectory $projectRoot `
    -ArgumentList @(
      "-NoExit",
      "-ExecutionPolicy", "Bypass",
      "-File", $scriptPath
    ) | Out-Null
  exit 0
}

Set-Location $projectRoot
npx tauri dev
exit $LASTEXITCODE
