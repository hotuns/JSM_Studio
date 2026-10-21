$ErrorActionPreference = "Stop"

function Get-RuntimeSha256([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  $hasher = [System.Security.Cryptography.SHA256]::Create()
  try {
    return [System.BitConverter]::ToString($hasher.ComputeHash($stream)).Replace("-", "")
  } finally {
    $hasher.Dispose()
    $stream.Dispose()
  }
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$sourceDir = Join-Path $projectRoot "JoyShockMapper"
$buildDir = Join-Path $projectRoot "build-jsm-engine-sdl"
$bundleDir = Join-Path $PSScriptRoot "..\src-tauri\bin\SDL"

if (-not (Test-Path -LiteralPath (Join-Path $sourceDir ".git"))) {
  throw "JoyShockMapper submodule is not initialized. Run: git submodule update --init --recursive"
}

$cmakeCommand = Get-Command "cmake" -ErrorAction SilentlyContinue
$cmakePath = if ($cmakeCommand) { $cmakeCommand.Source } else { $null }

if (-not $cmakePath) {
  $candidatePaths = @(
    (Join-Path ${env:ProgramFiles} "Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"),
    (Join-Path ${env:ProgramFiles} "Microsoft Visual Studio\17\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"),
    (Join-Path ${env:ProgramFiles} "Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"),
    (Join-Path ${env:ProgramFiles} "CMake\bin\cmake.exe")
  )

  $cmakePath = $candidatePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if (-not $cmakePath) {
  throw "CMake was not found. Install CMake or Visual Studio C++ tools, then rerun this command."
}

$sourceCommit = (& git -C $sourceDir rev-parse HEAD).Trim()
& $cmakePath -S $sourceDir -B $buildDir -DSDL=ON '-DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded$<$<CONFIG:Debug>:Debug>'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $cmakePath --build $buildDir --config Release --target JoyShockMapper --parallel 2
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$builtBinary = Get-ChildItem -LiteralPath $buildDir -Recurse -Filter "JoyShockMapper.exe" -File |
  Where-Object { $_.FullName -match "[\\/]Release[\\/]JoyShockMapper\.exe$" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $builtBinary) {
  throw "The Release JoyShockMapper.exe was not found under $buildDir."
}

$builtSdl = Join-Path $builtBinary.DirectoryName "SDL3.dll"
if (-not (Test-Path -LiteralPath $builtSdl)) {
  throw "SDL3.dll was not produced alongside JoyShockMapper.exe. Refusing to bundle an incomplete runtime."
}
$engineCmake = Get-Content -LiteralPath (Join-Path $sourceDir "JoyShockMapper\CMakeLists.txt") -Raw
$sdlTag = [regex]::Match($engineCmake, 'GIT_TAG\s+release-(\d+\.\d+\.\d+)')
if (-not $sdlTag.Success) {
  throw "Unable to find the pinned SDL release in the engine CMakeLists.txt."
}
$sdlVersionInfo = (Get-Item -LiteralPath $builtSdl).VersionInfo
$sdlVersion = "{0}.{1}.{2}" -f $sdlVersionInfo.ProductMajorPart, $sdlVersionInfo.ProductMinorPart, $sdlVersionInfo.ProductBuildPart
if ($sdlVersion -ne $sdlTag.Groups[1].Value) {
  throw "Built SDL version $sdlVersion does not match pinned version $($sdlTag.Groups[1].Value)."
}

New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null
Copy-Item -LiteralPath $builtBinary.FullName -Destination (Join-Path $bundleDir "JoyShockMapper.exe") -Force
# Include all runtime DLLs emitted alongside the executable, not just SDL3.dll.
Get-ChildItem -LiteralPath $builtBinary.DirectoryName -Filter "*.dll" -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $bundleDir $_.Name) -Force
}

$sourceDirty = [bool](& git -C $sourceDir status --porcelain)
$runtimeManifest = [ordered]@{
  sourceCommit = $sourceCommit
  sourceDirty = $sourceDirty
  sdlVersion = $sdlVersion
  files = @(Get-ChildItem -LiteralPath $builtBinary.DirectoryName -File | Where-Object {
    $_.Name -eq "JoyShockMapper.exe" -or $_.Extension -eq ".dll"
  } | ForEach-Object {
    [ordered]@{ name = $_.Name; sha256 = (Get-RuntimeSha256 $_.FullName) }
  })
}
$runtimeManifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $bundleDir "runtime-manifest.json") -Encoding UTF8
$sourceCommit | Set-Content -LiteralPath (Join-Path $bundleDir "JoyShockMapper.commit") -NoNewline
Write-Output "Bundled JoyShockMapper commit $sourceCommit (source dirty: $sourceDirty), SDL $sdlVersion"
