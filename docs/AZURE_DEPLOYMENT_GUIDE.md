# Azure Deployment Guide for EHI SaaS
**Complete Setup for Azure Static Web Apps**

---

## 📋 Overview

EHI SaaS is deployed as an **Azure Static Web App** because:
- ✅ 100% client-side processing (no backend needed for PHI)
- ✅ Automatic HTTPS and custom domains
- ✅ Built-in CI/CD with GitHub Actions
- ✅ Global CDN distribution
- ✅ Free tier available (perfect for MVP)
- ✅ No server management required

---

## 🏗️ Azure Resources Created

Unlike ETL_DataLineage which needs:
- Azure App Service (backend)
- Azure SQL Database (3 databases)
- Container Registry
- Key Vault

**EHI SaaS only needs:**
- ✅ **Azure Static Web App** (hosts the React app)
- ✅ **Resource Group** (container for resources)
- ✅ Optional: **Azure CDN** (for custom domain)
- ✅ Optional: **Application Insights** (for analytics without PHI)

---

## 🚀 Deployment Options

### Option 1: Azure Portal (Quick Start)

#### Step 1: Create Static Web App

1. **Login to Azure Portal**: https://portal.azure.com
2. **Click "Create a resource"**
3. **Search for "Static Web Apps"**
4. **Click "Create"**

#### Step 2: Configure

**Basics:**
- **Subscription**: Select your subscription
- **Resource Group**: Create new → `rg-ehi-saas-prod`
- **Name**: `ehi-saas-app`
- **Region**: East US (or closest to you)
- **Plan type**: Free (for MVP) or Standard (for production)

**Deployment:**
- **Source**: GitHub
- **GitHub Account**: Authorize Azure to access your repos
- **Organization**: Your GitHub org
- **Repository**: `EHI_SaaS` (or your repo name)
- **Branch**: `main`

**Build Details:**
- **Build Presets**: React
- **App location**: `/frontend`
- **Api location**: *(leave empty)*
- **Output location**: `dist`

#### Step 3: Review + Create

Click **"Create"** and wait ~2 minutes.

Azure will:
1. Create the Static Web App resource
2. Create a GitHub Actions workflow in your repo
3. Deploy your app automatically

#### Step 4: Get Deployment Token

After creation:
1. Go to your Static Web App resource
2. Click **"Manage deployment token"**
3. Copy the token
4. Add to GitHub Secrets as `AZURE_STATIC_WEB_APPS_API_TOKEN`

---

### Option 2: Azure CLI (Automated)

#### Prerequisites

```powershell
# Install Azure CLI (if not installed)
winget install -e --id Microsoft.AzureCLI

# Login
az login

# Set subscription (if you have multiple)
az account set --subscription "Your Subscription Name"
```

#### Deployment Script

Create `deploy-azure-ehi-saas.ps1`:

```powershell
# ============================================================================
# Azure Static Web Apps Deployment Script
# EHI SaaS Application
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Azure EHI SaaS Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Configuration
$RESOURCE_GROUP = "rg-ehi-saas-prod"
$LOCATION = "eastus"
$APP_NAME = "ehi-saas-app"
$GITHUB_REPO = "YOUR_ORG/YOUR_REPO"  # Update this
$BRANCH = "main"

# Create resource group
Write-Host "`n[1/3] Creating resource group..." -ForegroundColor Yellow
az group create `
    --name $RESOURCE_GROUP `
    --location $LOCATION

Write-Host "✅ Resource group created!" -ForegroundColor Green

# Create Static Web App
Write-Host "`n[2/3] Creating Static Web App..." -ForegroundColor Yellow
az staticwebapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --source "https://github.com/$GITHUB_REPO" `
    --location $LOCATION `
    --branch $BRANCH `
    --app-location "frontend" `
    --output-location "dist" `
    --login-with-github

Write-Host "✅ Static Web App created!" -ForegroundColor Green

# Get deployment token
Write-Host "`n[3/3] Retrieving deployment token..." -ForegroundColor Yellow
$deploymentToken = az staticwebapp secrets list `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query "properties.apiKey" `
    --output tsv

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`n📝 Next Steps:" -ForegroundColor Green
Write-Host "1. Add this secret to GitHub:" -ForegroundColor White
Write-Host "   Name:  AZURE_STATIC_WEB_APPS_API_TOKEN" -ForegroundColor Gray
Write-Host "   Value: $deploymentToken" -ForegroundColor Gray
Write-Host "`n2. Push to main branch to trigger deployment" -ForegroundColor White
Write-Host "`n3. Your app will be available at:" -ForegroundColor White
Write-Host "   https://$APP_NAME.azurestaticapps.net" -ForegroundColor Yellow

# Get app URL
$appUrl = az staticwebapp show `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query "defaultHostname" `
    --output tsv

Write-Host "`n🌐 Application URL: https://$appUrl" -ForegroundColor Cyan
```

Run the script:

```powershell
cd EHI_SaaS/scripts
.\deploy-azure-ehi-saas.ps1
```

---

## 🔑 GitHub Secrets Setup

### Required Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token | Azure Portal → Static Web App → Manage deployment token |

### Optional Secrets (if using Application Insights)

| Secret Name | Description |
|------------|-------------|
| `VITE_APP_INSIGHTS_KEY` | Application Insights connection string (no PHI!) |

---

## 📊 Optional: Application Insights (Analytics without PHI)

If you want usage analytics (page views, performance) **without sending any PHI**:

### 1. Create Application Insights

```powershell
# Create Application Insights
az monitor app-insights component create `
    --app ehi-saas-insights `
    --location eastus `
    --resource-group rg-ehi-saas-prod `
    --application-type web

# Get connection string
$connectionString = az monitor app-insights component show `
    --app ehi-saas-insights `
    --resource-group rg-ehi-saas-prod `
    --query "connectionString" `
    --output tsv

Write-Host "Connection String: $connectionString"
```

### 2. Add to GitHub Secrets

Add `VITE_APP_INSIGHTS_KEY` with the connection string.

### 3. Configure in Frontend

Update `frontend/.env.production`:

```env
VITE_APP_INSIGHTS_KEY=${{ secrets.VITE_APP_INSIGHTS_KEY }}
```

### 4. Important: Filter Out PHI

In your Application Insights configuration, **exclude all user data**:

```typescript
// frontend/src/main.tsx
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    connectionString: import.meta.env.VITE_APP_INSIGHTS_KEY,
    disableFetchTracking: true,  // Don't track fetch calls (may have PHI)
    disableAjaxTracking: true,   // Don't track AJAX
    enableAutoRouteTracking: true,  // Track page views only
    disableExceptionTracking: false,
  }
});

appInsights.loadAppInsights();

// NEVER log user data:
// ❌ Don't do: appInsights.trackEvent('fileUploaded', { fileName: 'patient.zip' });
// ✅ Do:       appInsights.trackEvent('fileUploaded', { fileType: 'zip' });
```

---

## 🌍 Custom Domain (Optional)

### Add Custom Domain

```powershell
# Add custom domain
az staticwebapp hostname set `
    --name ehi-saas-app `
    --resource-group rg-ehi-saas-prod `
    --hostname "ehi.yourdomain.com"
```

### DNS Configuration

Add a CNAME record to your DNS:

```
Type:  CNAME
Name:  ehi
Value: <your-app-name>.azurestaticapps.net
TTL:   3600
```

---

## 🔐 Security Configuration

### 1. CORS (Not Needed)

Since EHI SaaS is 100% client-side, there are **no CORS issues** because there's no backend API.

### 2. CSP (Content Security Policy)

Add to `frontend/public/staticwebapp.config.json`:

```json
{
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  },
  "routes": [
    {
      "route": "/*",
      "headers": {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer"
      }
    }
  ]
}
```

### 3. Authentication (Optional)

If you want to restrict access:

```json
{
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<tenant-id>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  }
}
```

---

## 🧪 Testing Deployment

### 1. Test Local Build

```powershell
cd frontend
npm run build
npm run preview
```

Visit: http://localhost:4173

### 2. Test Azure Deployment

After GitHub Actions completes:

```powershell
# Get app URL
az staticwebapp show `
    --name ehi-saas-app `
    --resource-group rg-ehi-saas-prod `
    --query "defaultHostname" `
    --output tsv
```

Visit: `https://<output>.azurestaticapps.net`

---

## 📈 Monitoring (No PHI)

### View Logs

```powershell
# View deployment logs in GitHub Actions
# No application logs needed (client-side only)
```

### Application Insights Queries (if configured)

```kql
// Page views by route
pageViews
| where timestamp > ago(7d)
| summarize Count = count() by name
| order by Count desc

// Performance metrics
pageViews
| where timestamp > ago(7d)
| summarize
    AvgDuration = avg(duration),
    P50 = percentile(duration, 50),
    P95 = percentile(duration, 95)
by name

// Browser usage
pageViews
| where timestamp > ago(30d)
| summarize Count = count() by client_Browser
| order by Count desc
```

**Remember**: Never log PHI to Application Insights!

---

## 💰 Cost Estimate

### Free Tier

| Resource | Free Tier | Cost |
|----------|-----------|------|
| Azure Static Web Apps | 100 GB bandwidth/month | **$0** |
| GitHub Actions | 2,000 minutes/month | **$0** |
| **Total** | | **$0/month** |

### Standard Tier (for production)

| Resource | Standard Tier | Cost |
|----------|---------------|------|
| Azure Static Web Apps | 100 GB bandwidth + custom domains | **$9/month** |
| Application Insights (optional) | 5 GB ingestion/month | **$0** (free tier) |
| **Total** | | **~$9/month** |

---

## 🔄 CI/CD Workflow

### Automatic Deployments

1. **Developer pushes to `main` branch**
   ↓
2. **GitHub Actions triggers**
   ↓
3. **Build React app** (`npm run build`)
   ↓
4. **Deploy to Azure Static Web Apps**
   ↓
5. **App live at** `https://<app-name>.azurestaticapps.net`

### Manual Deployment

```powershell
# Trigger manual deployment
cd frontend
npm run build

# Deploy using SWA CLI
npx @azure/static-web-apps-cli deploy `
    ./dist `
    --deployment-token $env:AZURE_STATIC_WEB_APPS_API_TOKEN
```

---

## 🆚 Comparison: EHI_SaaS vs ETL_DataLineage

| Feature | ETL_DataLineage | EHI_SaaS |
|---------|-----------------|----------|
| **Hosting** | Azure App Service | Azure Static Web Apps |
| **Backend** | Python/Node.js | None (client-side only) |
| **Database** | Azure SQL (3 DBs) | None (DuckDB-WASM in browser) |
| **Cost** | ~$50-100/month | ~$0-9/month |
| **Complexity** | High (multiple services) | Low (single service) |
| **PHI Location** | Server-side processing | Browser only (never leaves device) |
| **Scalability** | Manual scaling | Auto-scales globally |
| **Deployment** | Multi-step (backend + frontend) | Single-step (frontend only) |

---

## ✅ Deployment Checklist

- [ ] Azure account created
- [ ] Azure CLI installed and logged in
- [ ] Resource group created (`rg-ehi-saas-prod`)
- [ ] Static Web App created
- [ ] GitHub repository connected
- [ ] Deployment token added to GitHub Secrets
- [ ] GitHub Actions workflow added (`.github/workflows/azure-static-web-apps.yml`)
- [ ] Frontend builds successfully locally
- [ ] Push to `main` triggers deployment
- [ ] App accessible at Azure URL
- [ ] Optional: Custom domain configured
- [ ] Optional: Application Insights configured (no PHI!)
- [ ] Security headers configured (`staticwebapp.config.json`)
- [ ] Testing completed

---

## 🚨 Troubleshooting

### Build Fails in GitHub Actions

**Check:**
1. Node version matches (v18+)
2. `npm ci` runs successfully locally
3. Build output directory is `dist` (for Vite)

### App Shows 404

**Check:**
1. `output_location` is set to `dist` in workflow
2. `frontend/vite.config.ts` has correct base path

### Slow Performance

**Solutions:**
1. Enable Azure CDN
2. Optimize bundle size (check with `npm run build -- --stats`)
3. Use code splitting

---

## 📚 Additional Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [DuckDB-WASM Performance](https://duckdb.org/docs/api/wasm)

---

## 🎯 Next Steps

1. ✅ Deploy to Azure Static Web Apps
2. ⏳ Test with sample EHI files
3. ⏳ Monitor performance (no PHI in metrics!)
4. ⏳ Add custom domain (optional)
5. ⏳ Set up staging environment
6. ⏳ Configure authentication (optional)

---

**Last Updated**: March 4, 2026
**Version**: 1.0.0
