param(
    [Parameter(Mandatory = $true)][string]$Tag,
    [Parameter(Mandatory = $true)][string]$Commit
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectDir = Split-Path -Parent $PSScriptRoot
Push-Location $projectDir
try {
    node scripts/release-version.mjs $Tag --check
    if ($LASTEXITCODE -ne 0) { throw 'Release version check failed.' }
    if ($Commit -cnotmatch '\A[0-9a-f]{40}\z') { throw 'Commit must be a full Git SHA.' }
    $version = $Tag.Substring(1)
    $buildDir = Join-Path $projectDir 'src-tauri/target/release'
    $appExe = Join-Path $buildDir 'mirainote.exe'
    $installer = Join-Path $buildDir "bundle/nsis/MiraiNote_${version}_x64-setup.exe"
    foreach ($file in @($appExe, $installer)) {
        if (!(Test-Path -LiteralPath $file -PathType Leaf) -or (Get-Item -LiteralPath $file).Length -eq 0) {
            throw "Missing build output: $file"
        }
    }
    # Refuse stale binaries from a different version in a local build/cache.
    $binaryVersion = (Get-Item -LiteralPath $appExe).VersionInfo.ProductVersion
    if ($binaryVersion -ne $version) { throw "Binary version $binaryVersion does not match $version" }
    # Windows x64 assets must actually contain an AMD64 PE executable.
    $binary = [System.IO.File]::OpenRead($appExe)
    $reader = [System.IO.BinaryReader]::new($binary)
    try {
        if ($reader.ReadUInt16() -ne 0x5A4D) { throw 'Application is not a Windows executable.' }
        $binary.Position = 0x3C
        $peOffset = $reader.ReadUInt32()
        $binary.Position = $peOffset
        if ($reader.ReadUInt32() -ne 0x4550 -or $reader.ReadUInt16() -ne 0x8664) {
            throw 'Application must be a Windows x64 executable.'
        }
    } finally {
        $reader.Dispose()
        $binary.Dispose()
    }

    $outputDir = Join-Path $projectDir 'release-output'
    if (Test-Path -LiteralPath $outputDir) {
        throw 'release-output already exists. Move it away before packaging a new release.'
    }
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    $setupName = "MiraiNote_${version}_windows_x64_setup.exe"
    $zipName = "MiraiNote_${version}_windows_x64_portable.zip"
    Copy-Item -LiteralPath $installer -Destination (Join-Path $outputDir $setupName)

    # Only the executable is archived; never include local connection data, keys or source files.
    Compress-Archive -LiteralPath $appExe -DestinationPath (Join-Path $outputDir $zipName) -CompressionLevel Optimal
    $manifest = [ordered]@{
        name = 'MiraiNote'
        version = $version
        tag = $Tag
        commit = $Commit
        platform = 'windows'
        arch = 'x64'
        prerelease = $version.Contains('-')
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputDir 'version.json') -Encoding utf8NoBOM
    $checksums = foreach ($name in @($setupName, $zipName, 'version.json')) {
        $hash = (Get-FileHash -LiteralPath (Join-Path $outputDir $name) -Algorithm SHA256).Hash.ToLowerInvariant()
        "$hash  $name"
    }
    [System.IO.File]::WriteAllText((Join-Path $outputDir 'SHA256SUMS.txt'), ($checksums -join "`n") + "`n")
    Get-ChildItem -LiteralPath $outputDir | Select-Object Name, Length
} finally {
    Pop-Location
}
