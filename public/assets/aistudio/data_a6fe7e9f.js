/* Reading from and saving to the Google Sheet (via the Apps Script link). */

/* ---------- data ---------- */
function parseCSV(t) {
  const r = []; let row = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; row.push(c); r.push(row); row = []; c = ""; }
    else c += ch;
  }
  if (c || row.length) { row.push(c); r.push(row); }
  return r;
}
const norm = r => {
  const f = D(r.from), t = D(r.to);
  return { id: String(r.id), division: r.division || "", parent: r.parent ? String(r.parent) : "", title: r.title || "",
    from: f ? iso(f) : "", to: t ? iso(t) : "", status: STAT.includes(r.status) ? r.status : "Not Started", requested_status: STAT.includes(r.requested_status) ? r.requested_status : "",
    assignee: r.assignee || "", manager_remark: r.manager_remark || "", exec_reply: r.exec_reply || "" };
};
async function fetchRows() {
  if (!CONFIG.SCRIPT_URL) {
    const a = parseCSV(await (await fetch(CONFIG.CSV_URL + "&t=" + Date.now())).text());
    const h = a.shift().map(x => x.trim().toLowerCase());
    return a.filter(r => r[0]).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] || ""])));
  }
  let txt;
  try { txt = await (await fetch(CONFIG.SCRIPT_URL)).text(); }
  catch (e) { throw new Error("Could not reach the Apps Script link. In Apps Script choose Deploy, Manage deployments, set who has access to Anyone, and deploy a new version."); }
  let j;
  try { j = JSON.parse(txt); }
  catch (e) { throw new Error("The Apps Script link returned a web page instead of data. Open the link in a new browser tab to see the error."); }
  if (!Array.isArray(j)) throw new Error("Apps Script error: " + (j && j.error ? j.error : "unknown"));
  return j;
}
async function load() {
  try {
    const rows = await fetchRows();
    tasks = rows.filter(r => r.id !== "" && r.id != null).map(norm);
    const miss = rows.length && !("requested_status" in rows[0]);
    $("note").hidden = !!CONFIG.SCRIPT_URL && !miss;
    $("note").textContent = !CONFIG.SCRIPT_URL ? "View only. Add the Apps Script link in js/config.js to save changes to the sheet."
      : "Add a column named requested_status in cell L1 of the sheet to turn on status approvals.";
  } catch (e) {
    $("note").hidden = false;
    $("note").textContent = e.message || "Could not load the sheet.";
  }
  render();
}
async function save(t) {
  if (!CONFIG.SCRIPT_URL) return toast("View only: connect the Apps Script to save");
  t.updated = new Date().toISOString();
  const i = tasks.findIndex(x => x.id === t.id);
  i < 0 ? tasks.push(t) : (tasks[i] = t);
  render();
  try {
    await fetch(CONFIG.SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(t) });
    toast("Saving...");
    setTimeout(() => verify(t.id), 3000);
  } catch (e) { toast("Save failed. Try again."); }
}
/* The browser cannot read the reply to a save, so read the sheet back and check the row is there. */
async function verify(id) {
  try {
    const now = tasks.find(x => x.id === id), r = (await fetchRows()).find(x => String(x.id) === id);
    const ok = now && r && String(r.title) === now.title && String(r.status) === now.status && String(r.requested_status || "") === (now.requested_status || "");
    toast(ok ? "Saved to the sheet" : "Not saved to the sheet. Check the Apps Script setup.");
  } catch (e) { toast("Could not confirm the save. Check the Apps Script setup."); }
}
function toast(m) { const e = $("toast"); e.textContent = m; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 2600); }
