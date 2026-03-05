# Quick Start: Deploy EHI SaaS to Azure
**Get your app running on Azure in 10 minutes**

---

## 🚀 Quick Deployment (3 Steps)

### Step 1: Run the Deployment Script

```powershell
# Navigate to project root
cd EHI_SaaS

# Run deployment script
.\scripts\deploy-azure.ps1 -GitHubRepo "YOUR_ORG/YOUR_REPO"

# Example:
# .\scripts\deploy-azure.ps1 -GitHubRepo "cedars-sinai/ehi-saas"
```

**What it creates:**
- ✅ Resource Group: `rg-ehi-saas-prod`
- ✅ Static Web App: `ehi-saas-app`
- ✅ Application Insights: `ehi-saas-app-insights` (optional analytics)

**Time:** ~3-5 minutes

---

### Step 2: Add GitHub Secret

The script will output a deployment token. Add it to GitHub:

1. **Go to:** `https://github.com/YOUR_ORG/YOUR_REPO/settings/secrets/actions`
2. **Click:** "New repository secret"
3. **Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN`
4. **Value:** *(paste the token from script output)*
5. **Click:** "Add secret"

---

### Step 3: Push to GitHub

```bash
git add .
git commit -m "Add Azure deployment configuration"
git push origin main
```

**GitHub Actions will automatically:**
1. Build your React app
2. Deploy to Azure Static Web Apps
3. Make it live at: `https://ehi-saas-app.azurestaticapps.net`

---

## 📊 Verify Deployment

### Check GitHub Actions

1. Go to: `https://github.com/YOUR_ORG/YOUR_REPO/actions`
2. Find the workflow: "Deploy EHI SaaS to Azure Static Web Apps"
3. Wait for green checkmark ✅

### Visit Your App

```
https://ehi-saas-app.azurestaticapps.net
```

---

## 🎯 Common Scenarios

### Custom Resource Names

```powershell
.\scripts\deploy-azure.ps1 `
    -GitHubRepo "your-org/your-repo" `
    -ResourceGroupName "rg-ehi-prod" `
    -AppName "ehi-app" `
    -Location "westus"
```

### Skip Analytics

```powershell
.\scripts\deploy-azure.ps1 `
    -GitHubRepo "your-org/your-repo" `
    -SkipAppInsights
```

### Different Environment

```powershell
# Staging
.\scripts\deploy-azure.ps1 `
    -GitHubRepo "your-org/your-repo" `
    -AppName "ehi-saas-staging" `
    -Environment "staging" `
    -Branch "develop"

# Production
.\scripts\deploy-azure.ps1 `
    -GitHubRepo "your-org/your-repo" `
    -AppName "ehi-saas-prod" `
    -Environment "production" `
    -Branch "main"
```

---

## 🔧 Troubleshooting

### "GitHub authorization failed"

**Solution:**
1. Run: `az login`
2. Use `--login-with-github` flag (script does this automatically)
3. Or create Static Web App via Azure Portal with GitHub integration

### "Deployment token not found"

**Solution:**
Get it manually:
```powershell
az staticwebapp secrets list `
    --name ehi-saas-app `
    --resource-group rg-ehi-saas-prod `
    --query "properties.apiKey" `
    --output tsv
```

### "Build fails in GitHub Actions"

**Check:**
1. Node version in workflow matches local (v18+)
2. Frontend builds locally: `cd frontend && npm run build`
3. Output directory is `dist` in workflow

---

## 📚 Full Documentation

For detailed setup, see:
- [Complete Azure Deployment Guide](AZURE_DEPLOYMENT_GUIDE.md)
- [Architecture Overview](ARCHITECTURE.md)

---

## 💰 Cost

**Free Tier:**
- 100 GB bandwidth/month
- Perfect for MVP and testing

**Standard Tier:**
- $9/month for production
- Custom domains included

---

## ✅ Checklist

- [ ] Azure CLI installed
- [ ] Azure account active
- [ ] GitHub repository created
- [ ] Deployment script executed
- [ ] GitHub secret added
- [ ] Code pushed to main branch
- [ ] GitHub Actions completed successfully
- [ ] App accessible at Azure URL

---

**Need help?** See [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md) for detailed instructions.
