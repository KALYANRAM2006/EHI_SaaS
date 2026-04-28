# SaaS Configuration Guide - ClinQuilt

**Date:** April 28, 2026
**Feature:** Settings UI for Multi-Tenant Configuration
**Status:** ✅ Production-Ready
**Model:** SaaS with Client-Side Configuration

---

## Overview

ClinQuilt now supports a **SaaS (Software as a Service) model** where:
- ✅ One deployment serves multiple users
- ✅ Each user configures their own CMS API credentials
- ✅ All configuration stored **locally in browser** (localStorage)
- ✅ **No server-side credential storage** (zero PHI server + zero credential server)
- ✅ Each browser instance = separate configuration

This is perfect for healthcare organizations where:
- Individual clinicians need their own CMS API access
- Multiple departments share the same app instance
- Privacy and security are paramount (credentials never leave the device)

---

## Architecture

### Client-Side Configuration Storage

```
┌─────────────────────────────────────┐
│   User's Browser (localStorage)    │
│                                     │
│  {                                  │
│    cmsApi: {                        │
│      enabled: true,                 │
│      clientId: "user123...",        │
│      clientSecret: "secret456..."   │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
         ↓
         ↓ Direct API calls (no server proxy)
         ↓
┌─────────────────────────────────────┐
│       CMS API (api.cms.gov)         │
└─────────────────────────────────────┘
```

**Key Points:**
- Configuration stored in browser's localStorage
- Each user/browser has separate config
- No centralized credential database
- Credentials never sent to ClinQuilt servers
- API calls go directly: Browser → CMS (no proxy)

---

## How to Configure (User Guide)

### Step 1: Navigate to Settings

1. **Open ClinQuilt app**
2. **Load patient data** (or use demo mode)
3. **Click "Settings" tab** at the top navigation

### Step 2: Enable CMS API

1. Find the **"CMS Prior Authorization API"** section
2. **Toggle the switch** to ON (turns purple)
3. Section expands showing configuration fields

### Step 3: Enter CMS Credentials

**Get credentials first:**
- Visit: https://www.cms.gov/apis
- Register for API access
- Create an application
- Copy your Client ID and Client Secret

**Enter in ClinQuilt:**
1. **API Base URL:** (pre-filled) `https://api.cms.gov/fhir/v1`
2. **OAuth Token URL:** (pre-filled) `https://api.cms.gov/oauth2/token`
3. **Client ID:** Paste your CMS Client ID
4. **Client Secret:** Paste your CMS Client Secret
   - Click eye icon to show/hide secret
   - Never share this with anyone!

### Step 4: Save Configuration

1. Click **"Save Settings"** button (blue gradient)
2. Wait for validation
3. Should see: **"Settings saved successfully"** (green banner)
4. Status should show: **"CMS API Configured"** (green)

### Step 5: Test the Integration

1. Navigate to **"Payer Tools"** tab
2. Scroll to **"CMS Prior Authorization Status"** section
3. Should see:
   - Badge: **"API Connected"** (green)
   - Real prior authorization data from CMS
   - No "Demo Mode" banner

**If still showing Demo Mode:**
- Check that toggle is ON
- Verify credentials are correct
- Click refresh button to reload
- Check browser console for errors

---

## Configuration Management

### Export Configuration (Backup)

**Use Case:** Backup your settings or transfer to another device

**Steps:**
1. Go to Settings tab
2. Click **"Export"** button (bottom right)
3. Downloads: `clinquilt-config.json`
4. Save this file securely (contains credentials!)

**Security Note:** The exported file contains your Client Secret. Store it securely!

### Import Configuration (Restore)

**Use Case:** Restore settings from backup or new device

**Steps:**
1. Go to Settings tab
2. Click **"Import"** button (bottom right)
3. Select your `clinquilt-config.json` file
4. Settings automatically restored
5. Click "Save Settings" to apply

### Reset to Defaults

**Use Case:** Clear all settings and start fresh

**Steps:**
1. Go to Settings tab
2. Click **"Reset to Defaults"** button
3. Confirm the action
4. All settings cleared
5. CMS API disabled
6. Must reconfigure from scratch

---

## Multi-Tenant Scenarios

### Scenario 1: Hospital with Multiple Departments

**Setup:**
- Each department uses same ClinQuilt URL
- Each department has their own CMS API credentials
- Each clinician uses their own browser/device

**How it Works:**
1. **Department A** (Dr. Smith):
   - Opens ClinQuilt on their laptop
   - Configures Dept A's CMS credentials
   - Settings saved in Dr. Smith's browser

2. **Department B** (Dr. Jones):
   - Opens ClinQuilt on their laptop
   - Configures Dept B's CMS credentials
   - Settings saved in Dr. Jones's browser

3. **Result:**
   - Same app, different configurations
   - No credential conflicts
   - Each sees their own prior auth data

### Scenario 2: Shared Workstation

**Setup:**
- Multiple clinicians share one computer
- Each clinician needs their own CMS access
- Use browser profiles to separate

**How it Works:**
1. **Create separate browser profiles:**
   - Chrome: Settings → Add Person
   - Firefox: about:profiles → Create Profile
   - Edge: Settings → Profiles → Add profile

2. **Each clinician:**
   - Uses their own browser profile
   - Configures their own CMS credentials
   - Data isolated per profile

3. **Result:**
   - One computer, multiple isolated configurations
   - No credential sharing
   - Each clinician's settings protected

### Scenario 3: Personal Devices

**Setup:**
- Each clinician uses their own device
- Personal CMS credentials
- Full privacy

**How it Works:**
1. **Each clinician:**
   - Opens ClinQuilt on personal device
   - Configures personal CMS credentials
   - Settings stay on device forever

2. **If device changes:**
   - Export config from old device
   - Import config to new device
   - Or reconfigure manually

---

## Security Considerations

### Where Credentials are Stored

**localStorage Location:**
```javascript
Key: "clinquilt_config"
Location: Browser's localStorage
Visibility: Only this domain (ClinQuilt)
Persistence: Until manually cleared
```

**What this means:**
- ✅ Credentials never sent to ClinQuilt servers
- ✅ Other websites cannot access them
- ✅ Persists across browser restarts
- ❌ Accessible to JavaScript on ClinQuilt domain
- ❌ Not encrypted in localStorage (browser-dependent)

### Best Practices

**DO:**
- ✅ Use unique CMS credentials per user
- ✅ Enable CMS API only when needed
- ✅ Export config as backup
- ✅ Use browser profiles for shared computers
- ✅ Clear browser data when leaving shared computer

**DON'T:**
- ❌ Share your Client Secret with others
- ❌ Use the same credentials across departments
- ❌ Email the exported config file
- ❌ Commit credentials to version control
- ❌ Leave credentials on public computers

### Clearing Credentials

**When leaving a shared computer:**

**Option 1: Disable CMS API**
1. Go to Settings
2. Toggle CMS API OFF
3. Click Save Settings
4. Credentials still saved but not used

**Option 2: Reset Settings**
1. Go to Settings
2. Click "Reset to Defaults"
3. All credentials deleted

**Option 3: Clear Browser Data**
1. Browser Settings → Privacy
2. Clear browsing data
3. Select "localStorage"
4. All ClinQuilt data deleted

---

## API Call Flow

### With Configuration

```
User Action: Check prior auth status
    ↓
1. Load config from localStorage
    ↓
2. Check if CMS API enabled
    ↓
3. Get Client ID & Secret from config
    ↓
4. Request OAuth token from CMS
    ↓
5. Make API call with token
    ↓
6. Display results to user
```

### Without Configuration

```
User Action: Check prior auth status
    ↓
1. Load config from localStorage
    ↓
2. Check if CMS API enabled → FALSE
    ↓
3. Use mock data instead
    ↓
4. Display "Demo Mode" banner
```

---

## Developer Notes

### Configuration Service API

**Load configuration:**
```javascript
import { loadConfig } from '../services/configService'

const config = loadConfig()
console.log(config.cmsApi.clientId)
```

**Save configuration:**
```javascript
import { saveConfig } from '../services/configService'

const newConfig = {
  cmsApi: {
    enabled: true,
    clientId: 'abc123',
    clientSecret: 'secret456',
  }
}
saveConfig(newConfig)
```

**Check if configured:**
```javascript
import { isCMSApiConfiguredInSettings } from '../services/configService'

if (isCMSApiConfiguredInSettings()) {
  // Use real API
} else {
  // Use mock data
}
```

### Adding New Configuration Fields

**Example: Add new API endpoint**

1. **Update default config** in `configService.js`:
```javascript
const DEFAULT_CONFIG = {
  cmsApi: {
    enabled: false,
    baseUrl: 'https://api.cms.gov/fhir/v1',
    newEndpoint: 'https://api.cms.gov/new', // NEW
  }
}
```

2. **Add UI field** in `SettingsView.jsx`:
```jsx
<input
  type="text"
  value={config.cmsApi.newEndpoint}
  onChange={(e) => updateCMSField('newEndpoint', e.target.value)}
/>
```

3. **Use in service** in `cmsApiService.js`:
```javascript
const config = getCMSConfig()
fetch(config.newEndpoint)
```

---

## Troubleshooting

### "Demo Mode" still showing after configuration

**Check:**
1. Is CMS API toggle **ON**?
2. Did you click **"Save Settings"**?
3. Are credentials valid? (check validation message)
4. Hard refresh page (Ctrl+Shift+R)
5. Check console for errors

**Fix:**
```javascript
// Open browser console, check config:
JSON.parse(localStorage.getItem('clinquilt_config'))

// Should see:
// { cmsApi: { enabled: true, clientId: "...", ... } }
```

### Credentials not persisting

**Possible causes:**
- Browser in incognito/private mode
- localStorage disabled in browser settings
- Browser extension blocking localStorage

**Fix:**
- Use normal browsing mode
- Check browser privacy settings
- Disable extensions temporarily

### Import fails with "Invalid configuration file"

**Possible causes:**
- File is corrupted
- Wrong file format
- Exported from different version

**Fix:**
- Re-export from working instance
- Check file is valid JSON
- Manually edit JSON if needed

### Lost credentials after browser update

**Possible causes:**
- Browser cleared localStorage
- Browser profile changed
- Settings reset

**Fix:**
- Import from backup (if available)
- Reconfigure manually
- Use export/import regularly as backup

---

## Comparison: .env vs localStorage

| Feature | .env File | localStorage (SaaS) |
|---------|-----------|---------------------|
| **Storage Location** | Server filesystem | Browser |
| **Per-User Config** | ❌ No (shared) | ✅ Yes |
| **Multi-Tenant** | ❌ Complex | ✅ Native |
| **Credential Security** | ✅ Server-side | ⚠️ Client-side |
| **Setup Complexity** | High (server access) | Low (just UI) |
| **User Control** | ❌ Admin only | ✅ Full control |
| **Portability** | ❌ Server-bound | ✅ Export/import |
| **Zero PHI Server** | ✅ Yes | ✅ Yes |

**Winner for SaaS:** localStorage (better multi-tenant support)

**Winner for Security:** .env (server-side protection)

**ClinQuilt Choice:** localStorage (prioritizes user control and SaaS model)

---

## Migration Guide

### From .env to Settings UI

**Old way (.env file):**
```env
VITE_CMS_CLIENT_ID=abc123
VITE_CMS_CLIENT_SECRET=secret456
```

**New way (Settings UI):**
1. Remove .env file (no longer needed)
2. Open Settings tab
3. Enter credentials in UI
4. Click Save

**Automatic fallback:**
- If .env exists, it still works
- Settings UI overrides .env
- localStorage takes priority

### From Individual .env to Multi-User SaaS

**Before:**
- Each user had their own .env file
- Required server access to configure
- Shared deployments difficult

**After:**
- Each user configures via UI
- No server access needed
- Perfect for shared deployments

**Migration:**
1. Deploy app without .env
2. Each user opens Settings
3. Each user enters their credentials
4. Each browser stores separately

---

## Production Deployment

### Recommended Setup

**For Healthcare Organization:**

1. **Deploy ClinQuilt** to: `https://clinquilt.hospital.org`
2. **Register with CMS** for API access (organization-wide)
3. **Get department credentials:**
   - Department A: Client ID/Secret
   - Department B: Client ID/Secret
   - Department C: Client ID/Secret
4. **Distribute instructions:**
   - Send setup guide to each department
   - Each configures via Settings UI
   - No IT intervention needed

**For Individual Clinicians:**

1. **Share ClinQuilt URL:** `https://clinquilt.hospital.org`
2. **Each clinician:**
   - Registers personal CMS account
   - Gets personal credentials
   - Configures via Settings UI
   - Full control over their data

### Infrastructure Requirements

**Minimal:**
- Static file hosting (S3, Netlify, Vercel)
- HTTPS required (for API calls)
- No backend server needed
- No database required

**Why so simple?**
- All config in browser
- All processing client-side
- Direct API calls to CMS
- True serverless architecture

---

## Summary

**Status:** ✅ Production-Ready SaaS Configuration

**What We Built:**
- Settings UI for CMS API credentials
- localStorage-based configuration
- Multi-tenant support (each browser = separate config)
- Export/import for backup
- Credential validation
- Toggle enable/disable
- Zero server-side storage

**Perfect for:**
- Healthcare organizations with multiple users
- Shared ClinQuilt deployments
- Privacy-focused environments
- Zero-trust architectures

**Security Model:**
- Credentials stored locally (browser)
- Never sent to ClinQuilt servers
- Each user controls their own
- Export/import for backup
- Can be cleared anytime

---

**Prepared by:** Claude Code + Rajendra Kalyan Ram Jonnagadla
**Date:** April 28, 2026
**Feature:** SaaS Configuration with Settings UI
**Status:** Production-Ready ✅
