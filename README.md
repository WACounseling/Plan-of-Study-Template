# Woodward Academy — Four-Year Course Planner

A counselor tool for building a grades 9–12 course plan that meets Woodward Academy and State of Georgia graduation requirements.
Hosted free on **GitHub Pages**; a small **Google Apps Script** creates the Google Doc.

**What it does**
- Step 1 student/counselor info incl. **projected graduation year** · Step 2 **prior credit** (Middle School Physical Science, Civics, language, math placement, plus transfer credit) · Step 3 four grade sections with Academic + Elective dropdowns that **update from prerequisites** · Step 4 cocurriculars (participating / interested) · live **credit tracker** (green / gold / coral) · celebration (stars, WA icon, graduation cap) when a requirement completes.
- **Submit** creates a Google Doc: 0.5" margins; page 1 = four-year plan, tracker, cocurriculars, projected graduation; page 2 = WA + Georgia graduation requirements, HOPE/Zell Miller, NCAA, GHSA, honors and key dates.
- The Doc is **owned by and editable by the counselor** and shared **view-only** with the student. No PDF is sent.

## 1. Publish the site (GitHub Pages)
1. Create a repository and upload everything in this folder (except `apps-script/` and `test/` if you prefer).
2. Settings → Pages → Deploy from branch → `main` / root. Your site will be at `https://<org>.github.io/<repo>/`.
   (The page itself holds no student data. A private repo with Pages needs GitHub Enterprise Cloud.)

## 2. Create the Google back end (about 10 minutes)
Use the Google account that should *create* the docs (for example a shared counseling account in the woodward.edu domain).
1. Go to script.google.com → New project. Paste `apps-script/Code.gs` over the default file. In Project Settings, tick **Show appsscript.json** and paste `apps-script/appsscript.json`.
2. Project Settings → **Script properties** → add:
   | Property | Value |
   |---|---|
   | `ACCESS_CODE` | a code counselors type on the site (required) |
   | `ALLOWED_COUNSELOR_DOMAIN` | `woodward.edu` |
   | `LOGO_URL` | `https://<org>.github.io/<repo>/assets/img/wordmark-red-600.png` |
   | `FOLDER_ID` | *(optional)* a Drive folder for new docs |
   | `SEND_EMAILS` / `TRANSFER_OWNERSHIP` | *(optional)* `false` to turn off the link emails / ownership transfer |
3. Run `authorizeAndCheck` once and approve the permissions. Optionally run `buildSampleDoc` to preview the layout.
4. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone**. Copy the URL (ends in `/exec`).
5. Put that URL in `assets/js/config.js` as `APPS_SCRIPT_URL`, commit, and you are live.

**Ownership transfer** uses `setOwner`, which works between accounts in the same Google Workspace domain. If it fails, the counselor is added as editor instead and a note is returned. After changing the script, redeploy (Deploy → Manage deployments → Edit → New version).

## 3. Updating each year
- Course data: `assets/js/catalog.js` (prerequisites are documented at the top). Cocurriculars: `cocurriculars.js`. Page-2 content: `reference.js`.
- Re-run `node test/engine.test.js` after catalog edits (`npm i jsdom` first to run `test/ui.test.js`).

## Notes and interpretations to review with your Academic Dean
- AP European History / AP Gov / AP Micro / AP Macro: the guide lists "HP US History" as a prerequisite and "AP US History" as a corequisite; the planner accepts either HP US History or AP US History (before or concurrently) and flags it for chair confirmation.
- Where the guide says "or permission of the chair", the course stays selectable and is marked **⚑ approval**; hard prerequisites lock the course.
- WA 8th-grade Physical Science credit is counted in total units and the grade-9 GHSA checkpoint; confirm treatment with the Registrar. A full WA sports season / Marching Band satisfies PE in the tracker pending Registrar verification.
- The Doc's page 2 is dense; depending on fonts it may run slightly past one page.
- Verify state, HOPE/Zell and NCAA figures each October (page 2 states the date they were checked).
