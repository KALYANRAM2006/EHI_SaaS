<#
.SYNOPSIS
  One-time setup: Create the demo Azure Static Web App and configure GitHub secrets.

.DESCRIPTION
  Run this ONCE to set up the demo deployment target. After this:
  - GitHub Actions will auto-deploy the demo branch to a separate URL
  - Use push-to-demo.ps1 to control what gets pushed and when it expires
#>

param(
    [string]$ResourceGroup = "healthlens-demo-rg",
    [string]$Location = "westus2",
    [string]$AppName = "healthlens-demo"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       DEMO AZURE STATIC WEB APP SETUP                 ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Azure CLI not found. Install from https://aka.ms/installazurecli" -ForegroundColor Red
    exit 1
}

# Login check
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in. Running az login..." -ForegroundColor Yellow
    az login
}

Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Gray
Write-Host ""

# Create resource group
Write-Host "Creating resource group '$ResourceGroup'..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location | Out-Null

# Create Static Web App (Free tier)
Write-Host "Creating Azure Static Web App '$AppName'..." -ForegroundColor Cyan
$swa = az staticwebapp create `
    --name $AppName `
    --resource-group $ResourceGroup `
    --source "https://github.com/KALYANRAM2006/EHI_SaaS" `
    --branch "demo" `
    --app-location "frontend" `
    --output-location "dist" `
    --login-with-github `
    --sku Free 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Static Web App creation may need manual GitHub auth. Trying without --login-with-github..." -ForegroundColor Yellow
    $swa = az staticwebapp create `
        --name $AppName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Free 2>&1
}

# Get the deployment token
Write-Host ""
Write-Host "Retrieving deployment token..." -ForegroundColor Cyan
$token = az staticwebapp secrets list --name $AppName --resource-group $ResourceGroup --query "properties.apiKey" -o tsv

if ($token) {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║       SETUP COMPLETE                                   ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Demo App URL will be shown after first deploy." -ForegroundColor White
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────┐" -ForegroundColor Yellow
    Write-Host "  │  NEXT STEP: Add this as a GitHub secret           │" -ForegroundColor Yellow
    Write-Host "  │                                                    │" -ForegroundColor Yellow
    Write-Host "  │  1. Go to: https://github.com/KALYANRAM2006/      │" -ForegroundColor Yellow
    Write-Host "  │     EHI_SaaS/settings/secrets/actions              │" -ForegroundColor Yellow
    Write-Host "  │                                                    │" -ForegroundColor Yellow
    Write-Host "  │  2. Create secret:                                 │" -ForegroundColor Yellow
    Write-Host "  │     Name:  AZURE_STATIC_WEB_APPS_API_TOKEN_DEMO    │" -ForegroundColor Yellow
    Write-Host "  │     Value: (token shown below)                     │" -ForegroundColor Yellow
    Write-Host "  └──────────────────────────────────────────────────┘" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Deployment Token:" -ForegroundColor White
    Write-Host "  $token" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  After adding the secret, run:" -ForegroundColor Gray
    Write-Host "    .\scripts\push-to-demo.ps1 -ExpiryDate 2026-04-15" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "WARNING: Could not retrieve token. Get it manually:" -ForegroundColor Yellow
    Write-Host "  az staticwebapp secrets list --name $AppName --resource-group $ResourceGroup" -ForegroundColor Gray
}
