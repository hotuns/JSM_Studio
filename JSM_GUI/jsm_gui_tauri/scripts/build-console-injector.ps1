$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $projectRoot "native\console-injector"
$buildDir = Join-Path $sourceDir "build"

$cmakeCommand = Get-Command "cmake" -ErrorAction SilentlyContinue
$cmakePath = if ($cmakeCommand) { $cmakeCommand.Source } else { $null }

if (-not $cmakePath) {
  $candidatePaths = @(
    (Join-Path ${env:ProgramFiles} "Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"),
    (Join-Path ${env:ProgramFiles} "Microsoft Visual Studio\17\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"),
    (Join-Path ${env:ProgramFiles} "Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe")
  )

  $cmakePath = $candidatePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if (-not $cmakePath) {
  throw "CMake was not found. Install CMake or Visual Studio C++ tools, then rerun this command."
}

& $cmakePath -S $sourceDir -B $buildDir
& $cmakePath --build $buildDir --config Release
