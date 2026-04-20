$ErrorActionPreference = "Stop"

function Get-Message {
    param([string]$Base64)

    return [System.Text.Encoding]::UTF8.GetString(
        [System.Convert]::FromBase64String($Base64)
    )
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

    throw (Get-Message "7ZqM6reAIO2FjOyKpO2KuOulvCDsi6TtlontlZjroKTrqbQgUHl0aG9uIDMuMTEr7J20IO2VhOyalO2VqeuLiOuLpC4=")
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
$regressionTestDirectory = Join-Path $repoRoot "qa/regression"
$serverPythonPath = Join-Path $repoRoot "apps/server"

$previousPythonPath = $env:PYTHONPATH
$env:PYTHONPATH = $serverPythonPath

Write-Host ""
Write-Host ("== {0} ==" -f (Get-Message "7ZqM6reAIO2FjOyKpO2KuA=="))
Write-Host (Get-Message "7ZW17IusIOyLnOuCmOumrOyYpCByZWdyZXNzaW9uIHRlc3Trpbwg7Iuk7ZaJ7ZWp64uI64ukLg==")

try {
    Invoke-InDirectory $regressionTestDirectory {
        & $pythonCommand -m unittest discover -s . -p "test_*.py"
    }

    if ($LASTEXITCODE -ne 0) {
        throw (Get-Message "7ZqM6reAIO2FjOyKpO2KuOyXkCDsi6TtjKjtlojsirXri4jri6Qu")
    }

    Write-Host (Get-Message "W+yZhOujjF0g7ZqM6reAIO2FjOyKpO2KuOqwgCDthrXqs7ztlojsirXri4jri6Qu")
}
finally {
    $env:PYTHONPATH = $previousPythonPath
}
