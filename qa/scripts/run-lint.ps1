$ErrorActionPreference = "Stop"

function Get-Message {
    param([string]$Base64)

    return [System.Text.Encoding]::UTF8.GetString(
        [System.Convert]::FromBase64String($Base64)
    )
}

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$qaRoot = Join-Path $repoRoot "qa"
$eslintCommand = Join-Path $qaRoot "node_modules/.bin/eslint.cmd"

Write-Host ""
Write-Host ("== {0} ==" -f (Get-Message "bGludCDqsoDsgqw="))
Write-Host (Get-Message "6rO17JygIO2MqO2CpOyngCwgd2ViLCBtb2JpbGUg7IaM7IqkIOy9lOuTnOulvCDqsoDsgqztlanri4jri6Qu")

Push-Location $repoRoot
try {
    & $eslintCommand -c ".\\qa\\eslint.config.mjs" --no-warn-ignored `
        ".\\packages\\shared\\index.js" `
        ".\\apps\\client\\web\\src" `
        ".\\apps\\client\\mobile\\src"

    if ($LASTEXITCODE -ne 0) {
        throw (Get-Message "bGludCDqsoDsgqzsl5Ag7Iuk7Yyo7ZaI7Iq164uI64ukLg==")
    }

    Write-Host (Get-Message "W+yZhOujjF0gbGludCDqsoDsgqzqsIAg7Ya16rO87ZaI7Iq164uI64ukLg==")
}
finally {
    Pop-Location
}
