$ErrorActionPreference = "Stop"

function Get-Message {
    param([string]$Base64)

    return [System.Text.Encoding]::UTF8.GetString(
        [System.Convert]::FromBase64String($Base64)
    )
}

function Write-Section {
    param([string]$Title)

    Write-Host ""
    Write-Host ("== {0} ==" -f $Title)
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

    throw (Get-Message "7ISc67KEIGNvbXBpbGUgY2hlY2vrpbwg7Iuk7ZaJ7ZWY66Ck66m0IFB5dGhvbiAzLjExK+ydtCDtlYTsmpTtlanri4jri6Qu")
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

Write-Section (Get-Message "7Ju5IO2DgOyehSDqsoDsgqw=")
Invoke-InDirectory (Join-Path $repoRoot "apps/client/web") { & npm.cmd run typecheck }
if ($LASTEXITCODE -ne 0) {
    throw (Get-Message "7Ju5IO2DgOyehSDqsoDsgqzsl5Ag7Iuk7Yyo7ZaI7Iq164uI64ukLg==")
}
Write-Host (Get-Message "W+2GteqzvF0g7Ju5IO2DgOyehSDqsoDsgqzqsIAg7Ya16rO87ZaI7Iq164uI64ukLg==")

Write-Section (Get-Message "66qo67CU7J28IO2DgOyehSDqsoDsgqw=")
Invoke-InDirectory (Join-Path $repoRoot "apps/client/mobile") { & npm.cmd run typecheck }
if ($LASTEXITCODE -ne 0) {
    throw (Get-Message "66qo67CU7J28IO2DgOyehSDqsoDsgqzsl5Ag7Iuk7Yyo7ZaI7Iq164uI64ukLg==")
}
Write-Host (Get-Message "W+2GteqzvF0g66qo67CU7J28IO2DgOyehSDqsoDsgqzqsIAg7Ya16rO87ZaI7Iq164uI64ukLg==")

Write-Section (Get-Message "7ISc67KEIOy7tO2MjOydvCDqsoDsgqw=")
$pythonCommand = Get-PythonCommand
Invoke-InDirectory (Join-Path $repoRoot "apps/server") { & $pythonCommand -m compileall app tests }
if ($LASTEXITCODE -ne 0) {
    throw (Get-Message "7ISc67KEIOy7tO2MjOydvCDqsoDsgqzsl5Ag7Iuk7Yyo7ZaI7Iq164uI64ukLg==")
}
Write-Host (Get-Message "W+2GteqzvF0g7ISc67KEIOy7tO2MjOydvCDqsoDsgqzqsIAg7Ya16rO87ZaI7Iq164uI64ukLg==")

Write-Host ""
Write-Host (Get-Message "W+yZhOujjF0gdHlwZWNoZWNr7JmAIGNvbXBpbGUgY2hlY2vqsIAg66qo65GQIO2GteqzvO2WiOyKteuLiOuLpC4=")
