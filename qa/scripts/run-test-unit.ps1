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

    throw (Get-Message "64uo7JyEIO2FjOyKpO2KuOulvCDsi6TtlontlZjroKTrqbQgUHl0aG9uIDMuMTEr7J20IO2VhOyalO2VqeuLiOuLpC4=")
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

Write-Host ""
Write-Host ("== {0} ==" -f (Get-Message "64uo7JyEIO2FjOyKpO2KuA=="))
Write-Host (Get-Message "7ISc67KE7J2YIOyInOyImCDroZzsp4Eg64uo7JyEIO2FjOyKpO2KuOulvCDsi6Ttlontlanri4jri6Qu")

try {
    Invoke-InDirectory $unitTestDirectory {
        & $pythonCommand -m unittest discover -s . -p "test_*.py"
    }

    if ($LASTEXITCODE -ne 0) {
        throw (Get-Message "64uo7JyEIO2FjOyKpO2KuOyXkCDsi6TtjKjtlojsirXri4jri6Qu")
    }

    Write-Host (Get-Message "W+yZhOujjF0g64uo7JyEIO2FjOyKpO2KuOqwgCDthrXqs7ztlojsirXri4jri6Qu")
}
finally {
    $env:PYTHONPATH = $previousPythonPath
}
