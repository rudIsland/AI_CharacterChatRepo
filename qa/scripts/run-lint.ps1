$ErrorActionPreference = "Stop"

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$qaRoot = Join-Path $repoRoot "qa"
$eslintCommand = Join-Path $qaRoot "node_modules/.bin/eslint.cmd"

Push-Location $repoRoot
try {
    & $eslintCommand -c ".\\qa\\eslint.config.mjs" --no-warn-ignored `
        ".\\packages\\shared\\index.js" `
        ".\\apps\\client\\web\\src" `
        ".\\apps\\client\\mobile\\src"
}
finally {
    Pop-Location
}
