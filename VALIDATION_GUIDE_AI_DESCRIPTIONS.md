# Validation Guide: AI-Generated Schema Descriptions

**Feature:** AI-Generated Schema Descriptions in Data Explorer
**Date:** April 23, 2026
**Status:** Deployed to Production

---

## Quick Validation Checklist

- [ ] Application loads successfully
- [ ] Can navigate to Data Explorer tab
- [ ] "Generate AI Descriptions" button is visible
- [ ] Clicking button shows progress indicator
- [ ] Descriptions generate successfully (30-60 seconds)
- [ ] Tooltips appear when hovering over field names
- [ ] Help (?) icons visible next to fields
- [ ] Descriptions are patient-friendly (not technical)
- [ ] Cache persists after page reload
- [ ] "Clear Cache" button works
- [ ] Fallback mode works when AI disabled

---

## Method 1: Test on Production (Recommended)

### Step 1: Access Live Application

**URL:** https://mango-wave-02e8cfe10.2.azurestaticapps.net

**Wait Time:** 3-5 minutes after last git push for deployment to complete

**How to Check Deployment Status:**
```bash
# Check latest commit on GitHub
curl -s https://api.github.com/repos/KALYANRAM2006/EHI_SaaS/commits/main | grep '"sha"' | head -1

# Expected: "sha": "61c0a01..." (our latest commit)
```

---

### Step 2: Load Sample Patient Data

**Option A: Use Demo Data Button**
1. Open application in browser
2. Click **"Try Demo Data"** button on landing page
3. Application loads with sample patient (John Smith, Patient Z2345678)

**Option B: Access Demo Mode Directly**
1. Navigate to: `https://mango-wave-02e8cfe10.2.azurestaticapps.net/?demo=true`
2. Auto-loads sample data

**Expected Result:**
- Dashboard loads with patient overview
- 10 tabs visible at top
- Patient name "Smith, John A" displayed

---

### Step 3: Navigate to Data Explorer Tab

1. Look at tab navigation bar at top of dashboard
2. Click on **"Data Explorer"** tab (7th tab)
3. Wait for view to load

**Expected Result:**
- See "Raw Data Explorer" header
- Purple **"Generate AI Descriptions"** button visible in top-right
- Data tree showing patient object with expandable sections
- Search bar at top

**Screenshot Location:** Tab navigation → "Data Explorer"

---

### Step 4: Check Initial State (Before Generation)

**What to Verify:**
- [ ] No tooltips appear when hovering over field names
- [ ] No (?) help icons visible
- [ ] No "AI descriptions active" message
- [ ] Button says "Generate AI Descriptions" (not "Regenerate")

**How to Test:**
1. Hover mouse over "medications" in the tree
2. **Expected:** No tooltip appears
3. Hover over "encounters"
4. **Expected:** No tooltip appears

---

### Step 5: Generate AI Descriptions

#### A. Click Generate Button

1. Click purple **"Generate AI Descriptions"** button (top-right)
2. Button should disable and change text to "Generating..."

**Expected Result:**
- Progress indicator appears below header
- Shows: "Generating AI descriptions... 0%"
- Progress bar (purple) starts filling
- Field counter shows: "0 / X fields"

#### B. Watch Progress

**What to Observe:**
- Progress percentage increases: 0% → 10% → 20% → ... → 100%
- Field counter updates: "1 / 25 fields (patient)" → "2 / 25 fields (medications)" → ...
- Progress bar fills from left to right
- Takes 30-60 seconds total

**Example Progress States:**
```
Generating AI descriptions... 15%
████░░░░░░░░░░░░░░░░░░░░░░░░
4 / 25 fields (medications)

↓

Generating AI descriptions... 45%
████████████░░░░░░░░░░░░░░░░
12 / 25 fields (encounters)

↓

Generating AI descriptions... 100%
████████████████████████████
25 / 25 fields (clinicalNotes)
```

#### C. Verify Completion

**Expected Result After Generation:**
- Progress indicator disappears
- Button text changes to **"Regenerate Descriptions"**
- New message appears: **"✨ AI descriptions active - hover over field names"**
- Small purple (?) icons appear next to field names in tree

**If Progress Fails:**
- Check console for errors: Press F12 → Console tab
- Look for error messages starting with `[SchemaDescription]`
- Common issue: AI mode disabled → See troubleshooting section

---

### Step 6: Test Tooltips

#### A. Test Top-Level Fields

**Field: medications**
1. Hover mouse over "medications: Array[5]" in data tree
2. Wait 0.5 seconds

**Expected Tooltip:**
```
┌─────────────────────────────────────┐
│ 💡 medications                      │
│                                     │
│ List of prescription drugs and      │
│ over-the-counter medications        │
│ currently being taken or            │
│ previously prescribed               │
└─────────────────────────────────────┘
```

**Verify:**
- [ ] Tooltip appears to the right of field name
- [ ] Purple background (dark purple: #581c87)
- [ ] White text, readable
- [ ] Has small arrow pointer on left side
- [ ] Description is patient-friendly (not technical)
- [ ] Tooltip disappears when mouse moves away

**Field: encounters**
1. Hover over "encounters: Array[12]"

**Expected Description:**
"Record of patient visits and interactions with healthcare providers including office visits, hospital admissions, and emergency room visits"

**Field: results**
1. Hover over "results: Array[8]"

**Expected Description:**
"Laboratory test results including blood work, urine analysis, and diagnostic test findings"

**Field: conditions**
1. Hover over "conditions: Array[5]"

**Expected Description:**
"List of diagnosed medical conditions and health problems"

#### B. Test Nested Fields

**Field: patient.name**
1. Click to expand "patient: Object"
2. Hover over "name: string" inside patient object

**Expected:**
- Tooltip appears with description
- Format: "Patient's full legal name" (or similar)

**Field: patient.birthDate**
1. Hover over "birthDate" inside patient

**Expected Description:**
"Date when the patient was born" or "Patient's date of birth"

#### C. Test Array Items

**medications[0]**
1. Click to expand "medications: Array[5]"
2. Hover over first array item "[0]"

**Expected:**
- Tooltip shows: "Item 1 in list of prescription drugs..." (references parent description)

---

### Step 7: Verify Help Icons

**What to Check:**
- [ ] Small purple (?) icon appears next to each field name
- [ ] Icon is subtle (not distracting)
- [ ] Icon is consistent across all fields
- [ ] Icon indicates tooltip is available

**How to Verify:**
1. Look at "medications: Array[5]" line
2. See small HelpCircle icon after the badge
3. Icon should be light purple (#a855f7) with opacity

---

### Step 8: Test Caching

#### A. Verify Descriptions Persist

1. Scroll down page to see multiple tooltips work
2. **Reload the page** (Ctrl+R or F5)
3. Navigate back to Data Explorer tab

**Expected Result:**
- Button still says "Regenerate Descriptions" (not "Generate")
- Message shows "✨ AI descriptions active"
- (?) icons still visible
- Hover over fields → Tooltips appear **immediately** (no regeneration)

**This proves:** Descriptions cached in localStorage

#### B. Check localStorage

1. Press F12 → Application tab (Chrome) or Storage tab (Firefox)
2. Expand "Local Storage" → Click your domain
3. Look for key: `clinquilt_schema_descriptions`

**Expected Value:**
```json
{
  "version": "1.0",
  "timestamp": 1714089600000,
  "descriptions": {
    "patient": "Core patient demographics including name, date of birth...",
    "medications": "List of prescription drugs and over-the-counter...",
    "encounters": "Record of patient visits and interactions...",
    ...
  }
}
```

**Verify:**
- [ ] Cache object exists
- [ ] Has "version" field
- [ ] Has "timestamp" field
- [ ] Has "descriptions" object with multiple fields

---

### Step 9: Test Clear Cache Button

1. Look for **"Clear Cache"** button next to "Regenerate Descriptions"
2. Click **"Clear Cache"**

**Expected Result:**
- Tooltips disappear
- (?) icons disappear
- Button text changes to "Generate AI Descriptions"
- Message disappears ("AI descriptions active")
- localStorage key `clinquilt_schema_descriptions` is deleted

**How to Verify:**
1. Hover over "medications" → No tooltip
2. F12 → Application → Local Storage → Key deleted

---

### Step 10: Test Regeneration

1. After clearing cache, click **"Generate AI Descriptions"** again
2. Watch progress bar (should be same as before)
3. Verify tooltips work again after completion

**Expected Result:**
- Regeneration works identically to first generation
- Descriptions may differ slightly (AI variation)
- Tooltips appear and work correctly

---

## Method 2: Test Locally (Development)

### Step 1: Start Local Development Server

```bash
cd "c:\Users\JonnagadlaR\OneDrive - Cedars-Sinai Health System\Custom-Apps\EHI_SaaS\frontend"

# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev
```

**Expected Output:**
```
  VITE v5.2.0  ready in 342 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 2: Open Application

1. Open browser to: http://localhost:5173/
2. Click "Try Demo Data" button
3. Navigate to Data Explorer tab

### Step 3: Follow Same Validation Steps

- Follow Steps 4-10 from Method 1 (above)
- Localhost behaves identically to production

### Step 4: Check Console for Debug Logs

Press F12 → Console tab

**Expected Log Messages:**
```
[SchemaDescription] Starting schema analysis...
[SchemaDescription] Analyzing 25 fields...
[SchemaDescription] 1/25: patient -> "Core patient demographics..."
[SchemaDescription] 2/25: medications -> "List of prescription drugs..."
...
[SchemaDescription] 25/25: clinicalNotes -> "Clinical documentation..."
[SchemaDescription] Schema analysis complete!
```

**Look for Errors:**
- Red error messages starting with `[SchemaDescription]`
- API errors from aiService
- Network errors

---

## Method 3: Test Fallback Mode (AI Disabled)

### Purpose
Verify that feature gracefully handles AI being unavailable

### Step 1: Disable AI Mode

**Option A: Via UI**
1. Click settings icon (if available in dashboard)
2. Set AI mode to "Disabled"

**Option B: Via Console**
```javascript
// Open F12 → Console
localStorage.setItem('clinquilt_ai_config', JSON.stringify({ mode: 'disabled' }))
location.reload()
```

### Step 2: Try to Generate Descriptions

1. Navigate to Data Explorer
2. Click "Generate AI Descriptions"

**Expected Result:**
- Warning message appears:
  ```
  ⚠️ AI Descriptions Unavailable
  AI mode is disabled. Enable Cloud AI mode in Settings to use this feature.
  ```
- Button is **disabled** (grayed out)
- Clicking does nothing

### Step 3: Generate with Fallback

**Option B: Temporarily enable API key in config**

If AI mode is enabled but descriptions still fail:

**Expected Fallback Descriptions:**
- `medications` → "List of 5 medications records"
- `encounters` → "List of 12 encounters records"
- `birthDate` → "Date of birth date"
- `patient` → "Patient information and details"

**These are less detailed but still helpful!**

### Step 4: Re-enable AI

```javascript
// Console
localStorage.setItem('clinquilt_ai_config', JSON.stringify({ mode: 'cloud' }))
location.reload()
```

---

## Common Issues & Troubleshooting

### Issue 1: "Generate AI Descriptions" Button Grayed Out

**Symptom:** Button is disabled, warning message shows "AI mode disabled"

**Cause:** AI mode is set to "Disabled" in settings

**Fix:**
1. Enable Cloud AI mode in application settings
2. Or set in console:
   ```javascript
   localStorage.setItem('clinquilt_ai_config', JSON.stringify({ mode: 'cloud', apiKey: 'YOUR_KEY' }))
   location.reload()
   ```

---

### Issue 2: Progress Gets Stuck at 0%

**Symptom:** Progress bar doesn't move, stays at "0 / X fields"

**Possible Causes:**
1. AI API key missing or invalid
2. Network error
3. Claude API rate limit exceeded

**Debugging:**
1. Open F12 → Console
2. Look for error messages:
   - `[SchemaDescription] AI generation failed for X: ...`
   - `Error: API key not found`
   - `429 Rate Limit Exceeded`

**Fix:**
- Check API key in settings
- Wait 1 minute if rate limited
- Verify internet connection

---

### Issue 3: Tooltips Don't Appear

**Symptom:** Generated descriptions, but hovering shows nothing

**Possible Causes:**
1. Descriptions not in state
2. Tooltip z-index issue
3. Mouse event handlers not working

**Debugging:**
1. Check React DevTools:
   - Component: Dashboard
   - State: `schemaDescriptions` should be populated object
2. Console log:
   ```javascript
   console.log('Descriptions:', schemaDescriptions)
   ```

**Fix:**
- If `schemaDescriptions` is null → regenerate
- If populated but tooltips don't show → CSS z-index issue

---

### Issue 4: Descriptions Are Too Technical

**Symptom:** Tooltips show medical jargon or technical terms

**Cause:** AI prompt needs refinement

**Example Bad Description:**
"Array of MedicationRequest resources conforming to FHIR R4 standard"

**Example Good Description:**
"List of prescription drugs and medications you are currently taking"

**Fix:**
- Clear cache
- Regenerate descriptions
- If still technical, prompt engineering needs adjustment in `schemaDescriptionService.js`

---

### Issue 5: Cache Won't Clear

**Symptom:** Clicking "Clear Cache" doesn't remove descriptions

**Debugging:**
1. F12 → Application → Local Storage
2. Check if `clinquilt_schema_descriptions` still exists
3. Try manual deletion:
   ```javascript
   localStorage.removeItem('clinquilt_schema_descriptions')
   location.reload()
   ```

---

## Validation Checklist - Complete Test

Use this checklist to perform comprehensive validation:

### Pre-Generation ✅
- [ ] Application loads without errors
- [ ] Data Explorer tab accessible
- [ ] "Generate AI Descriptions" button visible and enabled
- [ ] No tooltips present initially
- [ ] No (?) help icons visible
- [ ] No "AI descriptions active" message

### During Generation ✅
- [ ] Button changes to "Generating..." and disables
- [ ] Progress bar appears
- [ ] Progress percentage increases smoothly
- [ ] Field counter updates correctly
- [ ] Console shows generation logs (no errors)
- [ ] Takes 30-90 seconds depending on data size

### Post-Generation ✅
- [ ] Progress bar disappears
- [ ] Button changes to "Regenerate Descriptions"
- [ ] "✨ AI descriptions active" message appears
- [ ] (?) help icons appear next to field names
- [ ] Clear Cache button appears

### Tooltip Functionality ✅
- [ ] Hovering over field shows tooltip
- [ ] Tooltip appears within 0.5 seconds
- [ ] Tooltip has purple background
- [ ] Tooltip text is readable (white color)
- [ ] Tooltip has arrow pointer
- [ ] Description is patient-friendly
- [ ] Tooltip disappears when mouse leaves
- [ ] Works for all field types (arrays, objects, primitives)
- [ ] Works for nested fields
- [ ] Works for array items

### Caching ✅
- [ ] Descriptions saved to localStorage
- [ ] Page reload preserves descriptions
- [ ] Tooltips work immediately after reload (no regeneration)
- [ ] Cache has correct structure (version, timestamp, descriptions)

### Clear Cache ✅
- [ ] "Clear Cache" button works
- [ ] Tooltips disappear after clearing
- [ ] (?) icons disappear
- [ ] Button reverts to "Generate AI Descriptions"
- [ ] localStorage key is deleted

### Regeneration ✅
- [ ] Can regenerate after clearing
- [ ] Regeneration process identical to first generation
- [ ] Descriptions may vary slightly (AI variation)
- [ ] New descriptions work correctly

### Edge Cases ✅
- [ ] Works with small datasets (5 fields)
- [ ] Works with large datasets (50+ fields)
- [ ] Handles nested objects correctly
- [ ] Handles empty arrays gracefully
- [ ] Handles null/undefined values
- [ ] AI disabled mode shows appropriate warning
- [ ] Network errors handled gracefully

### Performance ✅
- [ ] Generation completes in reasonable time (<2 minutes)
- [ ] Tooltips render instantly (no lag)
- [ ] Page remains responsive during generation
- [ ] No memory leaks (check DevTools Memory profiler)

---

## Success Criteria

**Feature is VALID if:**
1. ✅ All checklist items pass
2. ✅ Descriptions are patient-friendly (readable by non-technical users)
3. ✅ Tooltips enhance user experience (not distracting)
4. ✅ Performance is acceptable (30-90 seconds generation)
5. ✅ Caching works correctly (instant load after first generation)
6. ✅ No console errors
7. ✅ Graceful handling of AI unavailability

**Feature is INVALID if:**
- ❌ Descriptions are too technical
- ❌ Tooltips don't appear
- ❌ Progress gets stuck
- ❌ Cache doesn't persist
- ❌ Console shows errors
- ❌ Generation takes >3 minutes
- ❌ App crashes during generation

---

## Test Results Template

Use this template to document your testing:

```markdown
## AI Schema Descriptions Validation - [Date]

**Tester:** [Your Name]
**Environment:** Production / Localhost
**Browser:** Chrome / Firefox / Edge
**Dataset:** Demo Patient (Z2345678)

### Test Results

#### Pre-Generation
- [ ] PASS / FAIL - Button visible and enabled
- [ ] PASS / FAIL - No tooltips initially

#### Generation Process
- [ ] PASS / FAIL - Progress bar appeared
- [ ] PASS / FAIL - Completed in [X] seconds
- [ ] PASS / FAIL - No errors in console

#### Tooltip Testing
- [ ] PASS / FAIL - medications tooltip
  - Description: "[Paste actual description]"
  - Patient-friendly: YES / NO
- [ ] PASS / FAIL - encounters tooltip
  - Description: "[Paste actual description]"
  - Patient-friendly: YES / NO
- [ ] PASS / FAIL - results tooltip
  - Description: "[Paste actual description]"
  - Patient-friendly: YES / NO

#### Caching
- [ ] PASS / FAIL - Descriptions persist after reload
- [ ] PASS / FAIL - localStorage entry exists

#### Clear Cache
- [ ] PASS / FAIL - Tooltips removed
- [ ] PASS / FAIL - Can regenerate

### Issues Found
1. [Describe any issues]
2. [Severity: High / Medium / Low]
3. [Steps to reproduce]

### Screenshots
- [Attach screenshots of tooltips, progress, etc.]

### Overall Assessment
**PASS** / **FAIL** / **PASS WITH ISSUES**

### Recommendations
- [Any suggestions for improvement]
```

---

## Next Steps After Validation

### If PASS:
1. ✅ Mark feature as validated
2. 📸 Capture screenshots for EHIgnite submission
3. 📝 Update wireframes documentation
4. 🎬 Record demo video
5. ✅ Add to feature list in README

### If FAIL:
1. 🐛 Document bugs in GitHub Issues
2. 🔧 Fix issues in code
3. 🔄 Retest
4. 📝 Update this validation guide with new findings

### If PASS WITH ISSUES:
1. ⚠️ Document minor issues
2. 🔄 Decide if blocking or can proceed
3. 📋 Create backlog items for future fixes

---

## Quick Validation Command

Run this in browser console for instant validation:

```javascript
// Quick Validation Check
(function() {
  const cache = localStorage.getItem('clinquilt_schema_descriptions')
  const hasCach = !!cache

  console.log('=== AI Descriptions Validation ===')
  console.log('Cache exists:', hasCache)

  if (hasCache) {
    const data = JSON.parse(cache)
    console.log('Cache version:', data.version)
    console.log('Fields cached:', Object.keys(data.descriptions).length)
    console.log('Sample description:', data.descriptions.medications)
  } else {
    console.log('⚠️ No cache found - descriptions not generated yet')
  }

  console.log('\n✅ Open Data Explorer and click "Generate AI Descriptions" to test')
})()
```

---

**Validation Guide Complete!**

Follow these steps to thoroughly validate the AI schema descriptions feature. Good luck! 🎯
