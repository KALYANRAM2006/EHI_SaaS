# Step-by-Step: Deploy EHI_SaaS to Azure
**Complete beginner-friendly deployment guide**

---

## 📋 Overview

This guide will walk you through deploying EHI_SaaS to Azure Static Web Apps from scratch. Total time: **15-20 minutes**.

---

## ✅ Prerequisites Checklist

Before starting, make sure you have:

- [ ] Azure account (we'll create one if needed)
- [ ] GitHub account
- [ ] Git installed on your computer
- [ ] PowerShell (Windows) or Terminal (Mac/Linux)
- [ ] EHI_SaaS code on your computer

---

## 🚀 Step 1: Create Azure Account (If Needed)

### 1.1: Sign Up for Azure

1. **Go to:** https://azure.microsoft.com/free
2. **Click:** "Start free" button
3. **Sign in** with your Microsoft account (or create one)
4. **Complete the sign-up:**
   - Enter your phone number for verification
   - Enter payment information (required but won't be charged for free tier)
   - Complete identity verification

**Free credits:** You get $200 credit for 30 days + 12 months of free services

### 1.2: Verify Your Account

1. **Check your email** for Azure welcome message
2. **Login to Azure Portal:** https://portal.azure.com
3. You should see the Azure dashboard

✅ **Checkpoint:** You can access https://portal.azure.com

---

## 🛠️ Step 2: Install Azure CLI

### Option A: Windows (Recommended)

**Using winget (easiest):**

```powershell
# Open PowerShell as Administrator
# Press Windows Key, type "PowerShell", right-click, "Run as Administrator"

winget install -e --id Microsoft.AzureCLI
```

**Or download installer:**
1. Go to: https://aka.ms/installazurecliwindows
2. Download and run the installer
3. Follow installation wizard
4. Restart PowerShell after installation

### Option B: Mac

```bash
# Open Terminal
brew update && brew install azure-cli
```

### Option C: Linux

```bash
# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Or for other distros, see: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
```

### 2.1: Verify Installation

```powershell
# Open new PowerShell window
az --version
```

You should see output like:
```
azure-cli                         2.57.0
...
```

✅ **Checkpoint:** `az --version` works

---

## 🔐 Step 3: Login to Azure

### 3.1: Login via Azure CLI

```powershell
# In PowerShell
az login
```

**What happens:**
1. A browser window will open
2. Sign in with your Azure account
3. Close browser when it says "You have signed in"
4. Return to PowerShell

### 3.2: Verify Login

```powershell
az account show
```

You should see your subscription info:
```json
{
  "name": "Your Subscription Name",
  "user": {
    "name": "your.email@example.com"
  }
}
```

✅ **Checkpoint:** `az account show` displays your subscription

---

## 📦 Step 4: Push Code to GitHub

### 4.1: Create GitHub Repository

1. **Go to:** https://github.com/new
2. **Repository name:** `EHI_SaaS` (or your preferred name)
3. **Visibility:** Private (recommended) or Public
4. **Do NOT initialize** with README (we already have one)
5. **Click:** "Create repository"

### 4.2: Note Your Repository URL

After creation, you'll see:
```
https://github.com/YOUR_USERNAME/EHI_SaaS
```

**Save this!** You'll need it in the next step.

### 4.3: Push Local Code to GitHub

```powershell
# Navigate to your EHI_SaaS folder
cd "C:\Users\jonnagadlar\OneDrive - Cedars-Sinai Health System\Custom-Apps\EHI_SaaS"

# If not already initialized
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Azure deployment ready"

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/EHI_SaaS.git

# Push to GitHub
git push -u origin main
```

**Note:** If you get an authentication error:
1. GitHub no longer supports password authentication
2. You need to create a **Personal Access Token (PAT)**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name: "EHI_SaaS Deployment"
   - Select scopes: `repo`, `workflow`
   - Click "Generate token"
   - **Copy the token** (you won't see it again!)
   - Use the token as your password when pushing

✅ **Checkpoint:** Your code is visible at `https://github.com/YOUR_USERNAME/EHI_SaaS`

---

## 🚀 Step 5: Run Deployment Script

### 5.1: Update Deployment Script (Important!)

Open `scripts/deploy-azure.ps1` and review the parameters. You don't need to edit the file, just note what you'll pass as parameters.

### 5.2: Run the Script

```powershell
# Navigate to EHI_SaaS folder
cd "C:\Users\jonnagadlar\OneDrive - Cedars-Sinai Health System\Custom-Apps\EHI_SaaS"

# Run deployment script (replace YOUR_USERNAME with your GitHub username)
.\scripts\deploy-azure.ps1 -GitHubRepo "YOUR_USERNAME/EHI_SaaS"

# Example:
# .\scripts\deploy-azure.ps1 -GitHubRepo "jonnagadlar/EHI_SaaS"
```

### 5.3: Follow Script Prompts

**You will see:**

```
═══════════════════════════════════════════════════════════════
  🚀 Azure Static Web Apps Deployment
  🏥 EHI SaaS - Electronic Health Information Normalization
═══════════════════════════════════════════════════════════════

Configuration Summary:
═══════════════════════════════════════════════════════════════
  Resource Group:        rg-ehi-saas-prod
  Location:              eastus
  Environment:           production
  Static Web App:        ehi-saas-app
  GitHub Repository:     YOUR_USERNAME/EHI_SaaS
  Branch:                main
  App Insights:          ehi-saas-app-insights
═══════════════════════════════════════════════════════════════

Continue with deployment? (yes/no):
```

**Type:** `yes` and press Enter

### 5.4: GitHub Authorization

**Important!** The script will prompt you to authorize Azure to access your GitHub account:

1. A browser window will open
2. **Sign in to GitHub** if not already signed in
3. **Review permissions** Azure is requesting
4. **Click "Authorize Azure-App-Service-Static-Web-Apps"**
5. Close browser when done

### 5.5: Wait for Deployment

The script will:
- ✅ Create resource group (~10 seconds)
- ✅ Create Static Web App (~2-3 minutes)
- ✅ Create Application Insights (~30 seconds)
- ✅ Retrieve deployment token (~5 seconds)

**Total time:** 3-5 minutes

### 5.6: Save the Output

**Very Important!** At the end, you'll see:

```
═══════════════════════════════════════════════════════════════
  ✅ Deployment Complete!
═══════════════════════════════════════════════════════════════

📝 Next Steps:

1. Add GitHub Secret for Deployment:
   Navigate to: https://github.com/YOUR_USERNAME/EHI_SaaS/settings/secrets/actions
   Create new secret:
     Name:  AZURE_STATIC_WEB_APPS_API_TOKEN
     Value: 1234567890abcdef1234567890abcdef-1234567890abcdef1234567890abcdef-1234567890abcdef

2. (Optional) Add Application Insights Secret:
   Create new secret:
     Name:  VITE_APP_INSIGHTS_KEY
     Value: InstrumentationKey=...

3. Push to GitHub to trigger deployment:
   git push origin main
```

**COPY THE TOKEN!** You'll need it in the next step.

✅ **Checkpoint:** Script completes successfully and displays deployment token

---

## 🔑 Step 6: Add GitHub Secret

### 6.1: Navigate to GitHub Secrets

1. **Go to your repository:** `https://github.com/YOUR_USERNAME/EHI_SaaS`
2. **Click:** "Settings" tab (at the top)
3. **Click:** "Secrets and variables" → "Actions" (in left sidebar)
4. **Click:** "New repository secret" (green button)

### 6.2: Add Deployment Token

**In the "New secret" form:**

1. **Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN`
2. **Secret:** Paste the token from Step 5.6
   - It looks like: `1234567890abcdef1234567890abcdef-1234567890abcdef1234567890abcdef-1234567890abcdef`
3. **Click:** "Add secret"

✅ **Checkpoint:** You see the secret listed as `AZURE_STATIC_WEB_APPS_API_TOKEN`

### 6.3: (Optional) Add Application Insights Secret

If you want analytics (NO PHI will be sent):

1. **Click:** "New repository secret" again
2. **Name:** `VITE_APP_INSIGHTS_KEY`
3. **Secret:** Paste the connection string from Step 5.6
4. **Click:** "Add secret"

---

## 🚢 Step 7: Deploy to Azure

### 7.1: Commit and Push Azure Files

```powershell
# Navigate to EHI_SaaS folder
cd "C:\Users\jonnagadlar\OneDrive - Cedars-Sinai Health System\Custom-Apps\EHI_SaaS"

# Add the new files
git add .

# Commit
git commit -m "Add Azure deployment configuration"

# Push to GitHub
git push origin main
```

### 7.2: Monitor Deployment in GitHub

1. **Go to:** `https://github.com/YOUR_USERNAME/EHI_SaaS/actions`
2. You should see a workflow running: **"Deploy EHI SaaS to Azure Static Web Apps"**
3. **Click on it** to see real-time logs

**The workflow will:**
- ✅ Checkout code (~10 seconds)
- ✅ Setup Node.js (~20 seconds)
- ✅ Install dependencies (~1-2 minutes)
- ✅ Build React app (~1-2 minutes)
- ✅ Deploy to Azure (~30 seconds)

**Total time:** 4-6 minutes

### 7.3: Wait for Green Checkmark

When you see:
- ✅ Green checkmark next to workflow name
- "This check has passed" message

Your app is deployed!

✅ **Checkpoint:** GitHub Actions workflow completes successfully

---

## 🎉 Step 8: Access Your Application

### 8.1: Get Your App URL

**Option A: From Deployment Script Output**

Look back at Step 5.6 output:
```
🌐 Application URL:
   https://ehi-saas-app.azurestaticapps.net
```

**Option B: From Azure Portal**

1. Go to: https://portal.azure.com
2. Search for: "ehi-saas-app"
3. Click on your Static Web App
4. Look for "URL" field
5. Copy the URL

**Option C: From PowerShell**

```powershell
az staticwebapp show `
    --name ehi-saas-app `
    --resource-group rg-ehi-saas-prod `
    --query "defaultHostname" `
    --output tsv
```

### 8.2: Visit Your App

1. **Open browser**
2. **Navigate to:** `https://ehi-saas-app.azurestaticapps.net` (or your URL)
3. **You should see:** Your EHI SaaS application!

✅ **Checkpoint:** Your app loads in the browser

---

## 🔍 Step 9: Verify Deployment

### 9.1: Test Basic Functionality

1. **Load the homepage** - Should show without errors
2. **Check browser console** (F12) - Should have no red errors
3. **Test file upload** (if implemented) - Should accept files

### 9.2: Check Azure Portal

1. **Go to:** https://portal.azure.com
2. **Search for:** "ehi-saas-app"
3. **Click on** your Static Web App
4. **You should see:**
   - Status: "Ready"
   - URL: Your app URL
   - Region: East US (or your selected region)

### 9.3: Check GitHub Actions

1. **Go to:** `https://github.com/YOUR_USERNAME/EHI_SaaS/actions`
2. **Latest workflow** should be green ✅
3. **Click on it** to see deployment details

✅ **Checkpoint:** Everything is green and working!

---

## 🎊 SUCCESS! What You've Accomplished

You have successfully:

✅ Created an Azure account (if needed)
✅ Installed and configured Azure CLI
✅ Created Azure Static Web App resource
✅ Connected GitHub to Azure
✅ Set up automatic deployments
✅ Deployed your first version
✅ Verified the application is live

**Your app is now:**
- 🌍 Live on the internet at: `https://ehi-saas-app.azurestaticapps.net`
- 🔄 Automatically deployed when you push to GitHub
- 🌐 Distributed globally via Azure CDN
- 🔒 Secured with HTTPS
- 💰 Running on free tier ($0/month)

---

## 🔄 Making Updates

### To deploy changes to your app:

```powershell
# Make your code changes in frontend/

# Commit changes
git add .
git commit -m "Description of changes"

# Push to GitHub
git push origin main

# GitHub Actions will automatically rebuild and redeploy!
```

**Wait 4-6 minutes** and your changes will be live.

---

## 📊 Monitoring Your App

### View Deployment History

1. **Azure Portal:** https://portal.azure.com
2. **Search for:** "ehi-saas-app"
3. **Click:** "Deployment History" (in left menu)

### View Application Insights (if enabled)

1. **Azure Portal:** https://portal.azure.com
2. **Search for:** "ehi-saas-app-insights"
3. **Click:** "Application Insights"
4. **View:** Page views, performance, errors (NO PHI)

### View GitHub Deployments

1. **Go to:** `https://github.com/YOUR_USERNAME/EHI_SaaS/actions`
2. **View all deployments** and their status

---

## 🆘 Troubleshooting

### Problem: "az: command not found"

**Solution:**
- Reinstall Azure CLI (Step 2)
- Restart PowerShell/Terminal
- Check PATH: `$env:PATH` (Windows) or `echo $PATH` (Mac/Linux)

### Problem: "Failed to create Static Web App"

**Solution:**
- Ensure you completed GitHub authorization
- Check you have permissions in Azure subscription
- Try creating manually in Azure Portal: https://portal.azure.com/#create/Microsoft.StaticApp

### Problem: "GitHub Actions fails on build"

**Solution:**
- Check Node.js version matches (v18+)
- Verify `frontend/package.json` exists
- Check build succeeds locally: `cd frontend && npm run build`
- Review error logs in GitHub Actions

### Problem: "404 when visiting app URL"

**Solution:**
- Wait 5 more minutes (deployment may still be processing)
- Check GitHub Actions completed successfully
- Verify `output_location: dist` in workflow matches your build output
- Check `frontend/vite.config.ts` base path

### Problem: "GitHub push requires authentication"

**Solution:**
- Create GitHub Personal Access Token: https://github.com/settings/tokens
- Select scopes: `repo`, `workflow`
- Use token as password when pushing

### Problem: "Resource group already exists"

**Solution:**
- Script will use existing resource group (this is fine)
- Or specify different name: `.\scripts\deploy-azure.ps1 -GitHubRepo "..." -ResourceGroupName "rg-ehi-saas-prod2"`

---

## 💡 Next Steps

Now that your app is deployed, you can:

### 1. Set Up Custom Domain (Optional)

```powershell
# Add custom domain
az staticwebapp hostname set `
    --name ehi-saas-app `
    --resource-group rg-ehi-saas-prod `
    --hostname "ehi.yourdomain.com"
```

Then add CNAME record in your DNS:
```
Type:  CNAME
Name:  ehi
Value: ehi-saas-app.azurestaticapps.net
```

### 2. Create Staging Environment

```powershell
# Deploy staging from develop branch
.\scripts\deploy-azure.ps1 `
    -GitHubRepo "YOUR_USERNAME/EHI_SaaS" `
    -AppName "ehi-saas-staging" `
    -Environment "staging" `
    -Branch "develop"
```

### 3. Enable Authentication (Optional)

Add to `frontend/public/staticwebapp.config.json`:
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

### 4. Monitor Performance

- Set up alerts in Application Insights
- Monitor page load times
- Track user engagement (NO PHI)

---

## 📚 Additional Resources

### Documentation
- [Azure Static Web Apps Docs](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [EHI_SaaS Architecture](ARCHITECTURE.md)

### Support
- Azure Support: https://azure.microsoft.com/support/
- GitHub Discussions: In your repository
- Stack Overflow: Tag `azure-static-web-apps`

### Cost Management
- View costs: https://portal.azure.com/#view/Microsoft_Azure_CostManagement
- Set budget alerts in Azure Portal
- Monitor usage in Static Web App dashboard

---

## ✅ Final Checklist

After completing this guide, you should have:

- [x] Azure account created and active
- [x] Azure CLI installed and logged in
- [x] GitHub repository with code
- [x] Azure Static Web App created
- [x] GitHub Actions workflow configured
- [x] Deployment token added to GitHub secrets
- [x] First deployment completed successfully
- [x] Application accessible via URL
- [x] Automatic deployments working

---

## 🎓 What You Learned

You now know how to:

1. ✅ Create Azure resources via CLI
2. ✅ Set up CI/CD with GitHub Actions
3. ✅ Deploy static web applications
4. ✅ Configure Azure Static Web Apps
5. ✅ Monitor deployments
6. ✅ Troubleshoot common issues

**Congratulations!** You've successfully deployed your first application to Azure! 🎉

---

## 💬 Need Help?

If you encounter issues not covered here:

1. Check [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md) for detailed info
2. Review GitHub Actions logs for specific errors
3. Check Azure Portal for resource status
4. Search Stack Overflow with error messages

---

**Last Updated:** March 4, 2026
**Tested On:** Windows 11, Azure CLI 2.57.0
**Estimated Time:** 15-20 minutes (first deployment)
