# ⚡ Quick Deploy: 3 Commands to Azure

**Complete deployment in 10 minutes**

---

## 🎯 TL;DR - The 3 Commands

```powershell
# 1. Deploy infrastructure
.\scripts\deploy-azure.ps1 -GitHubRepo "YOUR_USERNAME/EHI_SaaS"

# 2. Add GitHub secret (copy token from output)
#    → https://github.com/YOUR_USERNAME/EHI_SaaS/settings/secrets/actions
#    → Name: AZURE_STATIC_WEB_APPS_API_TOKEN

# 3. Push to GitHub
git add . && git commit -m "Deploy" && git push origin main
```

**Done!** Your app will be live at: `https://ehi-saas-app.azurestaticapps.net`

---

## 📊 Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Run Deployment Script (3 min)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  You:    .\scripts\deploy-azure.ps1 -GitHubRepo "..."      │
│           ↓                                                  │
│  Script: Creates Azure Static Web App                        │
│           ↓                                                  │
│  Script: Returns deployment token                            │
│           ↓                                                  │
│  You:    COPY THE TOKEN! 📋                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Add GitHub Secret (1 min)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  You:    Go to GitHub → Settings → Secrets                  │
│           ↓                                                  │
│  You:    Create secret: AZURE_STATIC_WEB_APPS_API_TOKEN    │
│           ↓                                                  │
│  You:    Paste the token from Step 1                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Push to GitHub (6 min)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  You:    git push origin main                                │
│           ↓                                                  │
│  GitHub: Triggers workflow                                   │
│           ↓                                                  │
│  GitHub: Builds React app                                    │
│           ↓                                                  │
│  GitHub: Deploys to Azure                                    │
│           ↓                                                  │
│  Azure:  App goes live! 🎉                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Prerequisites (One-Time Setup)

### Install Azure CLI (5 min)

```powershell
# Windows
winget install -e --id Microsoft.AzureCLI

# Mac
brew install azure-cli
```

### Login to Azure (1 min)

```powershell
az login
```

Browser opens → Sign in → Done

### Push to GitHub (if not done)

```powershell
cd EHI_SaaS
git remote add origin https://github.com/YOUR_USERNAME/EHI_SaaS.git
git push -u origin main
```

---

## 📝 Step-by-Step

### STEP 1: Deploy Infrastructure

```powershell
# Navigate to project
cd "C:\Users\jonnagadlar\OneDrive - Cedars-Sinai Health System\Custom-Apps\EHI_SaaS"

# Run script (replace YOUR_USERNAME)
.\scripts\deploy-azure.ps1 -GitHubRepo "YOUR_USERNAME/EHI_SaaS"

# When prompted:
# - Type: yes
# - Authorize GitHub in browser
# - Wait 3-5 minutes
# - COPY THE TOKEN from output!
```

**Output looks like:**
```
═══════════════════════════════════════════════════════════════
  ✅ Deployment Complete!
═══════════════════════════════════════════════════════════════

📝 Next Steps:

1. Add GitHub Secret for Deployment:
   Create new secret:
     Name:  AZURE_STATIC_WEB_APPS_API_TOKEN
     Value: abc123def456ghi789...  ← COPY THIS!
```

---

### STEP 2: Add GitHub Secret

1. **Open:** `https://github.com/YOUR_USERNAME/EHI_SaaS/settings/secrets/actions`

2. **Click:** "New repository secret"

3. **Fill in:**
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Secret: *(paste the token)*

4. **Click:** "Add secret"

---

### STEP 3: Push to GitHub

```powershell
# Still in EHI_SaaS folder

# Add all files
git add .

# Commit
git commit -m "Add Azure deployment configuration"

# Push (triggers deployment)
git push origin main
```

**Monitor progress:**
- Go to: `https://github.com/YOUR_USERNAME/EHI_SaaS/actions`
- Watch the workflow run
- Wait for green checkmark ✅

---

## 🎊 Success!

### Your app is now live at:

```
https://ehi-saas-app.azurestaticapps.net
```

### To get the exact URL:

```powershell
az staticwebapp show `
    --name ehi-saas-app `
    --resource-group rg-ehi-saas-prod `
    --query "defaultHostname" `
    --output tsv
```

---

## 🔄 Making Updates

### Every time you want to deploy changes:

```powershell
# Make your changes in frontend/

# Commit and push
git add .
git commit -m "Your changes"
git push origin main

# Wait 4-6 minutes
# Changes are automatically deployed!
```

---

## 🆘 Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| `az: command not found` | Install Azure CLI, restart terminal |
| Script fails | Run `az login` again |
| GitHub push fails | Create PAT at github.com/settings/tokens |
| Build fails | Check `cd frontend && npm run build` works |
| 404 error | Wait 5 more minutes |

**Need detailed help?** See [STEP_BY_STEP_DEPLOYMENT.md](docs/STEP_BY_STEP_DEPLOYMENT.md)

---

## 💡 Tips

### Custom Names

```powershell
.\scripts\deploy-azure.ps1 `
    -GitHubRepo "your/repo" `
    -AppName "my-custom-name" `
    -ResourceGroupName "rg-my-app"
```

### Different Environment

```powershell
# Staging
.\scripts\deploy-azure.ps1 `
    -GitHubRepo "your/repo" `
    -AppName "ehi-saas-staging" `
    -Branch "develop"
```

### Skip Analytics

```powershell
.\scripts\deploy-azure.ps1 `
    -GitHubRepo "your/repo" `
    -SkipAppInsights
```

---

## 💰 Cost

- **Free Tier:** $0/month (100 GB bandwidth)
- **Standard:** $9/month (for production)

**No credit card charged on free tier!**

---

## ✅ Checklist

- [ ] Azure CLI installed
- [ ] Logged in: `az login`
- [ ] Code on GitHub
- [ ] Ran deployment script
- [ ] Copied deployment token
- [ ] Added GitHub secret
- [ ] Pushed to GitHub
- [ ] GitHub Actions completed
- [ ] App is live!

---

## 📚 Full Documentation

- **This guide:** Quick 3-command deployment
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md):** Printable checklist
- **[STEP_BY_STEP_DEPLOYMENT.md](docs/STEP_BY_STEP_DEPLOYMENT.md):** Complete walkthrough
- **[AZURE_DEPLOYMENT_GUIDE.md](docs/AZURE_DEPLOYMENT_GUIDE.md):** Full reference

---

## 🎯 Remember

1. **Run script** → Get token
2. **Add secret** → Use token
3. **Push code** → Auto-deploys

**That's it!** 🚀

---

**Last Updated:** March 4, 2026
**Time Required:** 10 minutes
**Difficulty:** Easy
