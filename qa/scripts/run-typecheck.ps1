$ErrorActionPreference = "Stop"

function Write-Section {
    param([string]$Title)

    Write-Host ""
    Write-Host "== $Title =="
}

function Get-PythonCommand {
    foreach ($candidate in @("py", "python")) {
        $commandInfo = Get-Command $candidate -ErrorAction SilentlyContinue
        if (-not $commandInfo) {
            continue
        }

        try {
            & $candidate -c "import sys" *> $null
            if ($LASTEXITCODE -eq 0) {
                return $candidate
            }
        }
        catch {
        }
    }

    throw "Python 3.11+ is required to run the server compile check."
}

function Invoke-InDirectory {
    param(
        [string]$DirectoryPath,
        [scriptblock]$ScriptBlock
    )

    Push-Location $DirectoryPath
    try {
        & $ScriptBlock
    }
    finally {
        Pop-Location
    }
}

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

Write-Section "Web Typecheck"
Invoke-InDirectory (Join-Path $repoRoot "apps/client/web") { & npm.cmd run typecheck }

Write-Section "Mobile Typecheck"
Invoke-InDirectory (Join-Path $repoRoot "apps/client/mobile") { & npm.cmd run typecheck }

Write-Section "Server Compile Check"
$pythonCommand = Get-PythonCommand
Invoke-InDirectory (Join-Path $repoRoot "apps/server") { & $pythonCommand -m compileall app tests }
