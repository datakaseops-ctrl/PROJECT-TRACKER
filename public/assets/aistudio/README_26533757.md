# Divisional Project Tracker

A static web app (HTML, CSS, JavaScript) that uses a Google Sheet as its database.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page layout and script order |
| `css/style.css` | All styling |
| `js/config.js` | **Edit this:** sheet link, Apps Script link, users, PINs, divisions per executive |
| `js/core.js` | Constants, helpers, shared state |
| `js/data.js` | Load from and save to the sheet |
| `js/projects.js` | Progress and status calculations, who sees what |
| `js/views.js` | Dashboard, project page, Gantt chart |
| `js/dialogs.js` | Project and task forms, status approval |
| `js/auth.js` | Sign in and sign out |
| `js/main.js` | Start-up and auto refresh |
| `apps-script/Code.gs` | Paste into the Google Sheet's Apps Script (not deployed with the site) |

## Sheet columns (row 1, in this order)

`id, division, parent, title, from, to, status, assignee, manager_remark, exec_reply, updated, requested_status`

A row with a blank `parent` is a project. A row whose `parent` holds a project's `id` is a task of that project.

## Setup

1. Add the columns above to the first tab of the sheet and publish it to the web as CSV.
2. Paste `apps-script/Code.gs` into Extensions > Apps Script. Deploy as a Web app (Execute as: Me, Access: Anyone).
3. Put the Web app URL in `SCRIPT_URL` in `js/config.js`.
4. Push this folder to GitHub and import the repo in Vercel. No build settings are needed.

PINs sit in `js/config.js`, so they only keep casual users apart. They are not real security.

## If changes do not reach the sheet

1. Open the Web app URL (the `/exec` link) in a browser tab. You should see `[]` or a list of rows, and row 1 of the sheet should fill with headers.
2. If you see a sign-in page or "unable to open", set Deploy > Manage deployments > Who has access to **Anyone** and deploy a new version.
3. If you see an error mentioning `null` or `getSheets`, the script was not opened from the sheet. Fill in `SHEET_ID` at the top of `Code.gs`.
4. After editing `Code.gs`, always deploy a **New version**. The link stays the same.
