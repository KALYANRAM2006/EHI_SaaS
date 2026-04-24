# PDF Conversion Instructions

## How to Create the Final EHIgnite Submission PDF

### Step 1: Capture Screenshots

Follow the [EHIGNITE_WIREFRAMES.md](EHIGNITE_WIREFRAMES.md) guide to capture all 15 screenshots from the live application:
https://mango-wave-02e8cfe10.2.azurestaticapps.net

**Screenshots Needed:**
1. Landing page upload interface
2. Dashboard overview
3. AI summary
4. Interactive timeline
5. Clinical insights
6. Payer insurance coverage
7. Payer prior authorization
8. Payer cost analysis
9. Payer medication savings
10. Data lineage
11. Privacy & security panel
12. Data explorer SQL
13. AI assistant chat
14. Records clinical data
15. Mobile responsive view

**Save all screenshots** in a folder named `screenshots/` with filenames like:
- `01_landing_page_upload.png`
- `02_dashboard_overview.png`
- etc.

---

### Step 2: Convert Markdown to PDF

You have several options to convert `EHIGNITE_SUBMISSION_PDF.md` to PDF:

#### Option A: Using Microsoft Word (Recommended - Easiest)

1. **Open the Markdown file in VS Code or any text editor**
2. **Copy all content** (Ctrl+A, Ctrl+C)
3. **Open Microsoft Word**
4. **Paste** (Ctrl+V) - Word will preserve formatting
5. **Insert screenshots:**
   - Find each `[INSERT SCREENSHOT XX: ...]` placeholder
   - Delete the placeholder text
   - Insert → Pictures → select corresponding screenshot file
   - Resize image to fit page width (~6-7 inches)
   - Center align the image
   - Add caption below using "Insert Caption" feature
6. **Format the document:**
   - Adjust fonts if needed (Calibri or Arial, 11pt body text)
   - Ensure page breaks are in correct locations
   - Add header/footer with page numbers
7. **Save as PDF:**
   - File → Save As → PDF
   - Filename: `EHIgnite_Submission_ClinQuilt.pdf`

#### Option B: Using Pandoc (Command Line - Best Quality)

**Install Pandoc:**
- Windows: `choco install pandoc` or download from https://pandoc.org/installing.html
- Also install: `choco install miktex` (for LaTeX PDF engine)

**Convert to PDF:**
```bash
cd "c:\Users\JonnagadlaR\OneDrive - Cedars-Sinai Health System\Custom-Apps\EHI_SaaS"

pandoc EHIGNITE_SUBMISSION_PDF.md -o EHIgnite_Submission_ClinQuilt.pdf \
  --pdf-engine=xelatex \
  --variable geometry:margin=1in \
  --variable fontsize=11pt \
  --variable mainfont="Arial" \
  --toc \
  --toc-depth=2 \
  --number-sections
```

**Then manually insert screenshots** in the PDF using Adobe Acrobat or similar PDF editor.

#### Option C: Using Online Markdown to PDF Converter

1. **Go to:** https://www.markdowntopdf.com/ or https://cloudconvert.com/md-to-pdf
2. **Upload** `EHIGNITE_SUBMISSION_PDF.md`
3. **Download** the generated PDF
4. **Edit PDF** to insert screenshots using:
   - Adobe Acrobat DC
   - Foxit PDF Editor
   - PDF-XChange Editor (free)
   - Or re-import to Word, add images, export to PDF

#### Option D: Using VS Code Extension

1. **Install Extension:** "Markdown PDF" by yzane
2. **Open** `EHIGNITE_SUBMISSION_PDF.md` in VS Code
3. **Right-click** in editor → "Markdown PDF: Export (pdf)"
4. **Edit** the generated PDF to insert screenshots

---

### Step 3: Insert Screenshots

For each placeholder `[INSERT SCREENSHOT XX: ...]`:

1. **Locate the placeholder** in your PDF
2. **Delete the placeholder text**
3. **Insert the corresponding screenshot**
4. **Add caption** below the image using the text from the placeholder
5. **Format:**
   - Image width: 6-7 inches (full page width with margins)
   - Center aligned
   - Caption: 10pt italic text, centered below image
   - Add 0.25" space after caption before next text

**Example:**
```
[INSERT SCREENSHOT 01: Landing Page Upload Interface]

*Caption: ClinQuilt landing page showing drag-and-drop file upload...*
```

Becomes:

```
[Image: screenshot of landing page]

Caption: ClinQuilt landing page showing drag-and-drop file upload
interface with prominent "Zero PHI Server" privacy badge. Demonstrates
simple, intuitive UX for patients to upload EHI exports from any vendor.
```

---

### Step 4: Final PDF Formatting

**Before finalizing, check:**

- [ ] All 15 screenshots inserted
- [ ] All captions match the screenshots
- [ ] Page breaks are in appropriate locations (after major sections)
- [ ] Table of contents is accurate (if using Pandoc)
- [ ] Page numbers in footer
- [ ] Header shows: "EHIgnite Challenge Submission - ClinQuilt"
- [ ] Font is consistent (11pt body, 14pt headings)
- [ ] No orphan headings (heading at bottom of page with content on next page)
- [ ] File size reasonable (<20MB)

**Document Properties:**
- Title: EHIgnite Challenge Submission - ClinQuilt
- Author: Rajendra Kalyan Ram Jonnagadla
- Subject: Patient-Controlled Health Intelligence Platform
- Keywords: EHI, FHIR, Patient Portal, Healthcare, Privacy, AI

---

### Step 5: Quality Check

**Print preview or view PDF carefully:**
1. Read through entire document
2. Verify all screenshots are visible and clear
3. Check that captions describe the correct screenshots
4. Ensure no text is cut off at page boundaries
5. Verify links are not broken (if PDF supports hyperlinks)
6. Spellcheck one final time

---

### Step 6: Export and Submit

**Final filename:** `EHIgnite_Submission_ClinQuilt.pdf`

**File size target:** 10-20MB (with high-quality screenshots)

**Upload locations:**
1. GitHub repository (for version control)
2. EHIgnite Challenge submission portal
3. Backup to OneDrive/cloud storage

---

## Alternative: Create PDF with Screenshots Already Embedded

If you want to **avoid manual insertion**, you can:

1. **Create HTML version** from Markdown:
   ```bash
   pandoc EHIGNITE_SUBMISSION_PDF.md -o submission.html --standalone
   ```

2. **Edit HTML** to embed screenshot images:
   ```html
   <img src="screenshots/01_landing_page_upload.png" width="700" />
   <p style="text-align:center; font-style:italic;">
     Caption: ClinQuilt landing page showing...
   </p>
   ```

3. **Open HTML in Chrome**

4. **Print to PDF:**
   - Ctrl+P
   - Destination: "Save as PDF"
   - Layout: Portrait
   - Margins: Default
   - Background graphics: Enabled
   - Save

This method preserves all formatting and embeds images automatically, but requires more HTML/CSS knowledge.

---

## Recommended Approach

**For quickest results:**
1. Use **Microsoft Word** (Option A)
2. Copy/paste markdown content
3. Insert screenshots manually (15 images takes ~15 minutes)
4. Save as PDF
5. Done!

**For best quality:**
1. Use **Pandoc** (Option B) to generate base PDF
2. Use **Adobe Acrobat** or **Foxit** to insert screenshots
3. Fine-tune layout and formatting
4. Export final PDF

---

## Need Help?

If you encounter issues:
- Check that screenshot files exist in `screenshots/` folder
- Verify file sizes are reasonable (<5MB per image)
- Use PNG format for screenshots (better quality than JPG)
- Compress images if PDF file size exceeds 25MB

---

**Ready to create your submission PDF!**

Follow these steps and you'll have a professional, polished EHIgnite Challenge submission document with all screenshots properly integrated.
