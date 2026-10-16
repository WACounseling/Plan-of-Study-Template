# Woodward Academy — Four-Year Course Planner

A counselor tool that builds a grades 9–12 course plan meeting Woodward Academy and State of Georgia graduation requirements.
It is a static site (GitHub Pages) with **Google sign-in**: the counselor signs in with their @woodward.edu account, and the browser
creates the Google Doc **directly in that counselor's Drive** (they are the owner and can edit it) and shares it **view-only** with the student.
There is no Apps Script, no server and no access code.

## One-time Google Cloud setup (about 15 minutes; a Google Workspace admin should do this)
1. Go to **console.cloud.google.com** and sign in with a woodward.edu admin account. Create a **New project** named "WA Course Planner" (inside the woodward.edu organization).
2. **APIs & Services → Library**: enable **Google Drive API** and **Google Docs API**.
3. **Google Auth Platform / OAuth consent screen**:
   - User type **Internal** (only woodward.edu accounts can sign in; no Google review needed). *If "Internal" is not offered, the project is not inside your Workspace organization — create it from an org account.*
   - App name "WA Course Planner", support email = yours.
   - **Scopes** (Data access): add `openid`, `email`, `profile`, and `.../auth/drive.file`. These are the only permissions requested; `drive.file` lets the app touch only files it creates.
4. **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins**: your GitHub Pages origin only, e.g. `https://YOUR-USERNAME.github.io` (no path, no trailing slash). Add your custom domain too if you use one.
   - Leave redirect URIs empty. Create, then copy the **Client ID**.
5. In GitHub, edit `assets/js/config.js`, paste the Client ID into `GOOGLE_CLIENT_ID`, and commit. Wait about a minute and hard-refresh the site.

## Test it
1. Open the site → **Sign in with Google** with your woodward.edu account (other domains are rejected).
2. Fill Step 1 (use a second account of yours as the student email), complete a plan, and **Submit**.
3. Confirm: the Doc is in your Drive as owner; the student account sees it as **Viewer**; margins are 0.5"; page 2 is the reference. Check the logo and table layout once and tell your developer anything that looks off.

## What each file does
- `index.html`, `assets/css/styles.css` — page and Woodward brand styling.
- `assets/js/catalog.js` — course data and prerequisites (edit each year; keys are documented at the top). `cocurriculars.js`, `reference.js` — activities and page-2 content.
- `assets/js/engine.js` — prerequisite logic, course-load rules, credit tracker. `app.js` — interface.
- `assets/js/google.js` — Google sign-in and the Drive/Docs calls. `docbuilder.js` — builds the Doc content.
- `test/` — optional tests (`npm i jsdom`, then `node test/engine.test.js`, `node test/ui.test.js`, `node test/google.test.js`).

## Notes and interpretations to review with your Academic Dean
- AP European History / AP Gov / AP Micro / AP Macro: the guide lists "HP US History" as a prerequisite and "AP US History" as a corequisite; the planner accepts either (before or concurrently) and flags it for chair confirmation.
- Where the guide says "or permission of the chair", the course stays selectable and is marked **⚑ approval**; hard prerequisites lock the course.
- WA 8th-grade Physical Science credit is counted in total units and the grade-9 GHSA checkpoint; confirm with the Registrar. A full WA sports season or Marching Band satisfies PE in the tracker pending Registrar verification.
- Page 2 is dense and may run slightly past one page. Verify state, HOPE/Zell and NCAA figures each October.

## Troubleshooting
- **"Google sign-in is not configured"** — `GOOGLE_CLIENT_ID` is empty in `config.js`, or the page is cached (hard refresh).
- **Sign-in pop-up error `origin_mismatch`** — the Authorized JavaScript origin must exactly match the site's origin (`https://name.github.io`).
- **"access blocked / not authorized"** — the consent screen is not set to Internal, or the signer is outside woodward.edu.
- **Doc created but not shared** — the student's address may be outside your Workspace's sharing rules; share manually as Viewer. The site shows a note.
- **403 / API not enabled** — enable the Google Docs API and Google Drive API (step 2).
- **Sign-in is required each visit** — by design; tokens are not stored.
