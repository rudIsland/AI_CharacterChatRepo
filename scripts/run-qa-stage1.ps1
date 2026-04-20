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

    throw "Python 3.11+ is required to run server QA checks."
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

Write-Section "Static Check"
Invoke-InDirectory "apps/client/web" { & npm.cmd run typecheck }
Invoke-InDirectory "apps/client/mobile" { & npm.cmd run typecheck }

$pythonCommand = Get-PythonCommand
Invoke-InDirectory "apps/server" { & $pythonCommand -m compileall app tests }

Write-Section "Function Test"
Invoke-InDirectory "apps/server" { & $pythonCommand -m unittest tests.test_system_api_function }

Write-Section "Core Scenario Regression Test"
Invoke-InDirectory "apps/server" { & $pythonCommand -m unittest tests.test_chat_api_regression }
