# EHI_SaaS Azure Deployment Checklist
**Print this and check off as you go!**

---

## 📋 Pre-Deployment Checklist

- [ ] Azure account created (https://azure.microsoft.com/free)
- [ ] Azure Portal accessible (https://portal.azure.com)
- [ ] GitHub account created
- [ ] Git installed on computer
- [ ] PowerShell or Terminal available
- [ ] EHI_SaaS code downloaded

---

## 🛠️ Setup Checklist

### Azure CLI Installation

- [ ] Azure CLI installed
  ```powershell
  winget install -e --id Microsoft.AzureCLI
  ```
- [ ] Azure CLI verified
  ```powershell
  az --version
  ```
- [ ] Logged into Azure
  ```powershell
  az login
  ```
- [ ] Subscription verified
  ```powershell
  az account show
  ```

### GitHub Setup

- [ ] GitHub repository created at: `https://github.com/_________/EHI_SaaS`
- [ ] Code pushed to GitHub
  ```powershell
  cd EHI_SaaS
  git add .
  git commit -m "Initial commit"
  git remote add origin https://github.com/YOUR_USERNAME/EHI_SaaS.git
  git push -u origin main
  ```

---

## 🚀 Deployment Steps

### Step 1: Run Deployment Script

- [ ] Navigate to project folder
  ```powershell
  cd "C:\Users\jonnagadlar\OneDrive - Cedars-Sinai Health System\Custom-Apps\EHI_SaaS"
  ```

- [ ] Run deployment script (fill in your GitHub username)
  ```powershell
  .\scripts\deploy-azure.ps1 -GitHubRepo "YOUR_USERNAME/EHI_SaaS"
  ```

- [ ] Type `yes` when prompted
- [ ] Authorize GitHub when browser opens
- [ ] Wait for completion (3-5 minutes)
- [ ] **COPY DEPLOYMENT TOKEN** (very important!)

**My Deployment Token:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

### Step 2: Add GitHub Secret

- [ ] Go to: `https://github.com/YOUR_USERNAME/EHI_SaaS/settings/secrets/actions`
- [ ] Click "New repository secret"
- [ ] Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- [ ] Value: *(paste token from above)*
- [ ] Click "Add secret"

### Step 3: Deploy to Azure

- [ ] Commit Azure files
  ```powershell
  git add .
  git commit -m "Add Azure deployment configuration"
  git push origin main
  ```

- [ ] Monitor GitHub Actions: `https://github.com/YOUR_USERNAME/EHI_SaaS/actions`
- [ ] Wait for green checkmark ✅ (4-6 minutes)

---

## ✅ Verification Checklist

### Check Deployment

- [ ] GitHub Actions workflow completed successfully
- [ ] No red errors in GitHub Actions logs
- [ ] Azure Portal shows app as "Ready"

### Test Application

- [ ] App URL retrieved
  ```powershell
  az staticwebapp show `
      --name ehi-saas-app `
      --resource-group rg-ehi-saas-prod `
      --query "defaultHostname" `
      --output tsv
  ```

**My App URL:** `https://_______________________________.azurestaticapps.net`

- [ ] App loads in browser
- [ ] No errors in browser console (F12)
- [ ] Basic functionality works

---

## 📊 Post-Deployment Checklist

### Documentation

- [ ] Bookmark app URL
- [ ] Save deployment token in secure location
- [ ] Document any custom configurations
- [ ] Share URL with team (if applicable)

### Optional Enhancements

- [ ] Set up custom domain
- [ ] Configure Application Insights
- [ ] Create staging environment
- [ ] Set up authentication (if needed)
- [ ] Configure monitoring alerts

---

## 🔄 Future Updates Process

### Making Changes

1. - [ ] Make code changes in `frontend/`
2. - [ ] Test locally: `cd frontend && npm run dev`
3. - [ ] Commit changes: `git add . && git commit -m "Description"`
4. - [ ] Push to GitHub: `git push origin main`
5. - [ ] Wait 4-6 minutes for automatic deployment
6. - [ ] Verify changes at app URL

---

## 🆘 Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| `az: command not found` | Reinstall Azure CLI, restart terminal |
| GitHub authorization fails | Run `az login` again |
| Build fails | Check `cd frontend && npm run build` works locally |
| 404 on app URL | Wait 5 more minutes, check GitHub Actions |
| Push requires auth | Create GitHub Personal Access Token |

**For detailed troubleshooting, see:** [STEP_BY_STEP_DEPLOYMENT.md](docs/STEP_BY_STEP_DEPLOYMENT.md)

---

## 📝 Important Information

### Azure Resources Created

| Resource | Name | Purpose |
|----------|------|---------|
| Resource Group | `rg-ehi-saas-prod` | Container for all resources |
| Static Web App | `ehi-saas-app` | Hosts your application |
| App Insights | `ehi-saas-app-insights` | Analytics (optional) |

### Cost Information

- **Free Tier:** $0/month (100 GB bandwidth)
- **Standard Tier:** $9/month (for production with custom domain)

### GitHub Secrets Required

| Secret Name | Purpose |
|-------------|---------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Required for deployment |
| `VITE_APP_INSIGHTS_KEY` | Optional for analytics |

---

## ✅ Deployment Success Criteria

Your deployment is successful when:

- [x] ✅ GitHub Actions shows green checkmark
- [x] ✅ App URL is accessible
- [x] ✅ No errors in browser console
- [x] ✅ Azure Portal shows "Ready" status
- [x] ✅ Future pushes trigger automatic deployments

---

## 🎉 Congratulations!

Once all items are checked, your EHI_SaaS application is successfully deployed to Azure!

**App URL:** `https://_______________________________.azurestaticapps.net`

**Deployed on:** _____________________ (date)

**By:** _____________________ (your name)

---

## 📞 Support Resources

- **Detailed Guide:** [docs/STEP_BY_STEP_DEPLOYMENT.md](docs/STEP_BY_STEP_DEPLOYMENT.md)
- **Quick Start:** [docs/QUICK_START_AZURE.md](docs/QUICK_START_AZURE.md)
- **Full Guide:** [docs/AZURE_DEPLOYMENT_GUIDE.md](docs/AZURE_DEPLOYMENT_GUIDE.md)
- **Azure Docs:** https://docs.microsoft.com/en-us/azure/static-web-apps/

---

**Version:** 1.0
**Last Updated:** March 4, 2026
**Estimated Time:** 15-20 minutes
