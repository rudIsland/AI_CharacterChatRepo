$ErrorActionPreference = "Stop"

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

    throw "Python 3.11+ is required to run the unit test."
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
$pythonCommand = Get-PythonCommand
$unitTestDirectory = Join-Path $repoRoot "qa/unit"
$serverPythonPath = Join-Path $repoRoot "apps/server"

$previousPythonPath = $env:PYTHONPATH
$env:PYTHONPATH = $serverPythonPath

try {
    Invoke-InDirectory $unitTestDirectory {
        & $pythonCommand -m unittest discover -s . -p "test_*.py"
    }
}
finally {
    $env:PYTHONPATH = $previousPythonPath
}
