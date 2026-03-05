# ============================================================================
# Azure Static Web Apps Deployment Script
# EHI SaaS Application - Complete Infrastructure Setup
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-ehi-saas-prod",

    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",

    [Parameter(Mandatory=$false)]
    [string]$AppName = "ehi-saas-app",

    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",

    [Parameter(Mandatory=$false)]
    [string]$GitHubRepo = "",

    [Parameter(Mandatory=$false)]
    [string]$Branch = "main",

    [Parameter(Mandatory=$false)]
    [switch]$SkipAppInsights = $false,

    [Parameter(Mandatory=$false)]
    [switch]$WhatIf = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )

    $color = switch($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Info" { "Cyan" }
        "Header" { "Magenta" }
        default { "White" }
    }

    Write-Host $Message -ForegroundColor $color
}

# Banner
Write-Host @"

═══════════════════════════════════════════════════════════════
  🚀 Azure Static Web Apps Deployment
  🏥 EHI SaaS - Electronic Health Information Normalization
  📊 100% Client-Side Processing (Zero Server-Side PHI)
═══════════════════════════════════════════════════════════════

"@ -ForegroundColor Cyan

# Validate GitHub repo
if ([string]::IsNullOrEmpty($GitHubRepo)) {
    Write-ColorOutput "Error: GitHubRepo parameter is required!" "Error"
    Write-Host @"

Usage:
  .\deploy-azure.ps1 -GitHubRepo "YOUR_ORG/YOUR_REPO"

Example:
  .\deploy-azure.ps1 -GitHubRepo "cedars-sinai/ehi-saas" -ResourceGroupName "rg-ehi-saas-prod"

Optional Parameters:
  -ResourceGroupName    Resource group name (default: rg-ehi-saas-prod)
  -Location            Azure region (default: eastus)
  -AppName             Static web app name (default: ehi-saas-app)
  -Environment         Environment name (default: production)
  -Branch              Git branch (default: main)
  -SkipAppInsights     Skip Application Insights creation
  -WhatIf              Preview changes without creating resources

"@
    exit 1
}

# Configuration Summary
$APP_INSIGHTS_NAME = "${AppName}-insights"
$TIMESTAMP = Get-Date -Format "yyyyMMddHHmmss"

Write-Host @"

Configuration Summary:
═══════════════════════════════════════════════════════════════
  Resource Group:        $ResourceGroupName
  Location:             $Location
  Environment:          $Environment
  Static Web App:       $AppName
  GitHub Repository:    $GitHubRepo
  Branch:               $Branch
  App Insights:         $(if ($SkipAppInsights) { "Skipped" } else { $APP_INSIGHTS_NAME })
═══════════════════════════════════════════════════════════════

"@

if ($WhatIf) {
    Write-ColorOutput "WhatIf mode - no resources will be created" "Warning"
    exit 0
}

# Confirm deployment
$confirmation = Read-Host "Continue with deployment? (yes/no)"
if ($confirmation -ne "yes") {
    Write-ColorOutput "Deployment cancelled." "Warning"
    exit 0
}

# Start deployment
$startTime = Get-Date

# ============================================================================
# STEP 1: Check Prerequisites
# ============================================================================

Write-ColorOutput "`n[1/7] Checking Azure CLI..." "Info"

try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-ColorOutput "✓ Azure CLI version $($azVersion.'azure-cli') detected" "Success"
} catch {
    Write-ColorOutput "✗ Azure CLI not found!" "Error"
    Write-Host "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check Azure CLI extensions
Write-ColorOutput "  Checking required extensions..." "Info"
$extensions = az extension list --output json | ConvertFrom-Json
$hasStaticWebApp = $extensions | Where-Object { $_.name -eq "staticwebapp" }

if (-not $hasStaticWebApp) {
    Write-ColorOutput "  Installing staticwebapp extension..." "Warning"
    az extension add --name staticwebapp
}

# ============================================================================
# STEP 2: Verify Azure Login
# ============================================================================

Write-ColorOutput "`n[2/7] Verifying Azure login..." "Info"
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-ColorOutput "✓ Logged in as: $($account.user.name)" "Success"
    Write-ColorOutput "✓ Subscription: $($account.name)" "Success"
} catch {
    Write-ColorOutput "✗ Not logged in to Azure. Running 'az login'..." "Warning"
    az login
    $account = az account show --output json | ConvertFrom-Json
    Write-ColorOutput "✓ Login successful!" "Success"
}

# ============================================================================
# STEP 3: Create Resource Group
# ============================================================================

Write-ColorOutput "`n[3/7] Creating resource group..." "Info"

$rgExists = az group exists --name $ResourceGroupName
if ($rgExists -eq "true") {
    Write-ColorOutput "✓ Resource group '$ResourceGroupName' already exists" "Success"
} else {
    az group create `
        --name $ResourceGroupName `
        --location $Location `
        --tags Environment=$Environment Application=EHI-SaaS `
        --output none

    Write-ColorOutput "✓ Resource group created!" "Success"
}

# ============================================================================
# STEP 4: Create Static Web App
# ============================================================================

Write-ColorOutput "`n[4/7] Creating Static Web App..." "Info"
Write-ColorOutput "  This will connect to GitHub: $GitHubRepo" "Info"

# Check if app already exists
$appExists = az staticwebapp show `
    --name $AppName `
    --resource-group $ResourceGroupName `
    --output json 2>$null

if ($appExists) {
    Write-ColorOutput "✓ Static Web App '$AppName' already exists" "Warning"
    Write-ColorOutput "  Skipping creation (use Azure Portal to modify)" "Info"
} else {
    Write-ColorOutput "  Creating Static Web App (this may take 2-3 minutes)..." "Info"
    Write-ColorOutput "  You will be prompted to authorize GitHub access..." "Warning"

    try {
        az staticwebapp create `
            --name $AppName `
            --resource-group $ResourceGroupName `
            --source "https://github.com/$GitHubRepo" `
            --location $Location `
            --branch $Branch `
            --app-location "frontend" `
            --output-location "dist" `
            --login-with-github `
            --output none

        Write-ColorOutput "✓ Static Web App created!" "Success"
    } catch {
        Write-ColorOutput "✗ Failed to create Static Web App" "Error"
        Write-ColorOutput "  Error: $_" "Error"
        Write-ColorOutput "`n  You can create it manually in Azure Portal:" "Warning"
        Write-ColorOutput "  https://portal.azure.com/#create/Microsoft.StaticApp" "Info"
        exit 1
    }
}

# ============================================================================
# STEP 5: Get Deployment Token
# ============================================================================

Write-ColorOutput "`n[5/7] Retrieving deployment token..." "Info"

try {
    $deploymentToken = az staticwebapp secrets list `
        --name $AppName `
        --resource-group $ResourceGroupName `
        --query "properties.apiKey" `
        --output tsv

    Write-ColorOutput "✓ Deployment token retrieved!" "Success"
} catch {
    Write-ColorOutput "✗ Failed to retrieve deployment token" "Error"
    Write-ColorOutput "  You can get it from Azure Portal later" "Warning"
    $deploymentToken = ""
}

# ============================================================================
# STEP 6: Create Application Insights (Optional)
# ============================================================================

if (-not $SkipAppInsights) {
    Write-ColorOutput "`n[6/7] Creating Application Insights..." "Info"
    Write-ColorOutput "  (For analytics only - NO PHI will be sent!)" "Warning"

    $insightsExists = az monitor app-insights component show `
        --app $APP_INSIGHTS_NAME `
        --resource-group $ResourceGroupName `
        --output json 2>$null

    if ($insightsExists) {
        Write-ColorOutput "✓ Application Insights already exists" "Warning"
    } else {
        az monitor app-insights component create `
            --app $APP_INSIGHTS_NAME `
            --location $Location `
            --resource-group $ResourceGroupName `
            --application-type web `
            --tags Environment=$Environment Application=EHI-SaaS `
            --output none

        Write-ColorOutput "✓ Application Insights created!" "Success"
    }

    # Get connection string
    $connectionString = az monitor app-insights component show `
        --app $APP_INSIGHTS_NAME `
        --resource-group $ResourceGroupName `
        --query "connectionString" `
        --output tsv

} else {
    Write-ColorOutput "`n[6/7] Skipping Application Insights..." "Info"
    $connectionString = ""
}

# ============================================================================
# STEP 7: Get Application URL
# ============================================================================

Write-ColorOutput "`n[7/7] Retrieving application URL..." "Info"

$appUrl = az staticwebapp show `
    --name $AppName `
    --resource-group $ResourceGroupName `
    --query "defaultHostname" `
    --output tsv

Write-ColorOutput "✓ Application URL retrieved!" "Success"

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host @"

═══════════════════════════════════════════════════════════════
  ✅ Deployment Complete!
═══════════════════════════════════════════════════════════════

🌐 Application URL:
   https://$appUrl

📊 Azure Resources Created:
   ✓ Resource Group:     $ResourceGroupName
   ✓ Static Web App:     $AppName
   ✓ Location:           $Location
$(if (-not $SkipAppInsights) { "   ✓ App Insights:       $APP_INSIGHTS_NAME" } else { "" })

⏱️  Deployment Time:     $($duration.Minutes) minutes $($duration.Seconds) seconds

═══════════════════════════════════════════════════════════════

"@ -ForegroundColor Green

# ============================================================================
# NEXT STEPS
# ============================================================================

Write-ColorOutput "📝 Next Steps:" "Header"
Write-Host ""

Write-ColorOutput "1. Add GitHub Secret for Deployment:" "Info"
Write-Host "   Navigate to: https://github.com/$GitHubRepo/settings/secrets/actions" -ForegroundColor Gray
Write-Host "   Create new secret:" -ForegroundColor Gray
Write-Host "     Name:  AZURE_STATIC_WEB_APPS_API_TOKEN" -ForegroundColor Yellow
if ($deploymentToken) {
    Write-Host "     Value: $deploymentToken" -ForegroundColor Yellow
} else {
    Write-Host "     Value: <Get from Azure Portal → $AppName → Manage deployment token>" -ForegroundColor Yellow
}

if (-not $SkipAppInsights -and $connectionString) {
    Write-Host ""
    Write-ColorOutput "2. (Optional) Add Application Insights Secret:" "Info"
    Write-Host "   Create new secret:" -ForegroundColor Gray
    Write-Host "     Name:  VITE_APP_INSIGHTS_KEY" -ForegroundColor Yellow
    Write-Host "     Value: $connectionString" -ForegroundColor Yellow
    Write-Host ""
    Write-ColorOutput "   ⚠️  IMPORTANT: Configure to exclude PHI!" "Warning"
    Write-Host "   See: docs/AZURE_DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
}

Write-Host ""
Write-ColorOutput "3. Push to GitHub to trigger deployment:" "Info"
Write-Host "   git push origin $Branch" -ForegroundColor Yellow

Write-Host ""
Write-ColorOutput "4. Monitor deployment:" "Info"
Write-Host "   GitHub Actions: https://github.com/$GitHubRepo/actions" -ForegroundColor Gray
Write-Host "   Azure Portal:   https://portal.azure.com/#@/resource/subscriptions/$($account.id)/resourceGroups/$ResourceGroupName/providers/Microsoft.Web/staticSites/$AppName" -ForegroundColor Gray

Write-Host ""
Write-ColorOutput "5. Test your application:" "Info"
Write-Host "   https://$appUrl" -ForegroundColor Yellow

Write-Host @"

═══════════════════════════════════════════════════════════════
  📚 Documentation
═══════════════════════════════════════════════════════════════
  • Full Guide:    docs/AZURE_DEPLOYMENT_GUIDE.md
  • Architecture:  docs/ARCHITECTURE.md
  • Mapping Rules: docs/MAPPING_RULES.md

═══════════════════════════════════════════════════════════════

"@ -ForegroundColor Cyan

# Save deployment info to file
$deploymentInfo = @{
    DeploymentDate = $endTime.ToString("yyyy-MM-dd HH:mm:ss")
    ResourceGroup = $ResourceGroupName
    StaticWebApp = $AppName
    Location = $Location
    Environment = $Environment
    AppUrl = "https://$appUrl"
    GitHubRepo = $GitHubRepo
    Branch = $Branch
    AppInsights = if ($SkipAppInsights) { "Not created" } else { $APP_INSIGHTS_NAME }
    Duration = "$($duration.Minutes)m $($duration.Seconds)s"
}

$deploymentInfo | ConvertTo-Json | Out-File -FilePath "deployment-info-$TIMESTAMP.json" -Encoding UTF8
Write-ColorOutput "💾 Deployment info saved to: deployment-info-$TIMESTAMP.json" "Success"

Write-Host ""
Write-ColorOutput "🎉 Deployment script completed successfully!" "Success"
Write-Host ""
