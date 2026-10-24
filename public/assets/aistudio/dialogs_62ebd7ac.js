/* Pop-up forms: project form and task form (including status approval). */

/* ---------- dialogs ---------- */
const opt = (a, v) => a.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");

function editProject(id) {
  const dlg = $("dlg"), old = id && tasks.find(x => x.id === id);
  const t = old ? { ...old } : { id: "P" + Date.now().toString(36), division: DIVS.includes(filter) ? filter : "Administration", parent: "",
    title: "", from: iso(today), to: iso(add(today, 30)), status: "Not Started", assignee: "", manager_remark: "", exec_reply: "" };
  dlg.innerHTML = `<h3>${id ? "Edit project" : "New project"}</h3>
    <label for="f-t">Project name</label><input id="f-t" value="${esc(t.title)}">
    <label for="f-d">Division</label><select id="f-d">${opt(DIVS, t.division)}</select>
    <div class="two"><div><label for="f-f">From date</label><input type="date" id="f-f" value="${t.from}"></div>
    <div><label for="f-e">To date</label><input type="date" id="f-e" value="${t.to}"></div></div>
    <label for="f-n">Notes (optional)</label><textarea id="f-n" rows="3">${esc(t.manager_remark)}</textarea>
    <div class="act"><button id="f-x">Close</button><button class="p" id="f-ok">Save project</button></div>`;
  $("f-x").onclick = () => dlg.close();
  $("f-ok").onclick = async () => {
    t.title = $("f-t").value.trim(); t.division = $("f-d").value; t.from = $("f-f").value; t.to = $("f-e").value; t.manager_remark = $("f-n").value.trim();
    if (!t.title) return toast("Enter a project name");
    if (!t.from || !t.to || t.from > t.to) return toast("Check the from and to dates");
    if (!old) { prev = view; cur = t.id; view = "project"; }
    dlg.close(); await save(t);
    kids(t.id).forEach(k => { if (k.division !== t.division) save({ ...k, division: t.division, assignee: execsFor(t.division)[0] || k.assignee }); });
  };
  if (!dlg.open) dlg.showModal();
}

function openTask(id, pid) {
  const dlg = $("dlg"), old = id && tasks.find(x => x.id === id);
  const p = tasks.find(x => x.id === (old ? old.parent : pid));
  if (!p) return toast("Open a project first");
  const t = old ? { ...old } : { id: "T" + Date.now().toString(36), division: p.division, parent: p.id, title: "",
    from: p.from || iso(today), to: p.to || iso(today), status: "Not Started", requested_status: "", assignee: execsFor(p.division)[0] || "", manager_remark: "", exec_reply: "" };
  const M = user.role === "manager", mine = M || t.assignee === user.name;
  const pend = t.requested_status && t.requested_status !== t.status ? t.requested_status : "";
  const execs = execsFor(p.division); if (!execs.length) execs.push("");
  const stSel = `<select id="f-st"${mine ? "" : " disabled"}>${opt(STAT, t.status)}</select>`;
  const pendBox = pend ? `<div class="pb">Status change requested: ${esc(t.status)} to <b>${esc(pend)}</b>${M ? "" : ". Waiting for the Manager to approve."}</div>` : "";
  dlg.innerHTML = `<h3>${id ? "Task details" : "New task"}</h3><div class="mu">Project: ${esc(p.title)}</div>${pendBox}` + (M ? `
    <label for="f-t">Task</label><input id="f-t" value="${esc(t.title)}">
    <div class="two"><div><label for="f-a">Assigned to</label><select id="f-a">${opt(execs, t.assignee)}</select></div>
    <div><label for="f-st">Status</label>${stSel}</div></div>
    <div class="two"><div><label for="f-f">From date</label><input type="date" id="f-f" value="${t.from}"></div>
    <div><label for="f-e">To date</label><input type="date" id="f-e" value="${t.to}"></div></div>` : `
    <p><b>${esc(t.title)}</b><br><span class="mu">${t.assignee ? "Assigned to " + esc(t.assignee) + ", " : ""}${rng(t)}</span></p>
    <label for="f-st">Request a status change</label>${stSel}
    ${mine ? '<div class="mu" style="font-size:12px;margin-top:3px">The change takes effect after the Manager approves it.</div>' : ""}`)
    + (t.manager_remark ? `<label>Manager remarks</label><pre>${esc(t.manager_remark)}</pre>` : "")
    + (t.exec_reply ? `<label>Executive updates</label><pre>${esc(t.exec_reply)}</pre>` : "")
    + (mine ? `<label for="f-n">${M ? "Add a remark" : "Reply or add a progress note"}</label><textarea id="f-n" rows="3"></textarea>` : "")
    + `<div class="act"><button id="f-x">Close</button>${M && pend ? '<button id="f-no">Reject change</button><button id="f-yes" class="p">Approve change</button>' : ""}${mine ? `<button class="p" id="f-ok">${M ? "Save" : "Send update"}</button>` : ""}</div>`;
  const note = (k, txt) => { t[k] = (t[k] ? t[k] + "\n" : "") + new Date().toLocaleDateString("en-GB") + " " + user.name + ": " + txt; };
  const readM = () => {
    t.title = $("f-t").value.trim(); t.assignee = $("f-a").value; t.from = $("f-f").value; t.to = $("f-e").value;
    if (!t.title) { toast("Enter a task name"); return false; }
    if (!t.from || !t.to || t.from > t.to) { toast("Check the from and to dates"); return false; }
    return true;
  };
  $("f-x").onclick = () => dlg.close();
  if ($("f-yes")) $("f-yes").onclick = async () => {
    if (!readM()) return;
    const n = $("f-n").value.trim();
    t.status = pend; t.requested_status = ""; note("manager_remark", "Approved status change to " + pend + (n ? ". " + n : ""));
    dlg.close(); await save(t);
  };
  if ($("f-no")) $("f-no").onclick = async () => {
    if (!readM()) return;
    const n = $("f-n").value.trim();
    t.requested_status = ""; note("manager_remark", "Rejected status change to " + pend + (n ? ". " + n : ""));
    dlg.close(); await save(t);
  };
  if ($("f-ok")) $("f-ok").onclick = async () => {
    const ns = $("f-st").value; let sent = false;
    if (M) { if (!readM()) return; t.status = ns; if (t.requested_status === t.status) t.requested_status = ""; }
    else if (ns !== t.status) { t.requested_status = ns; note("exec_reply", "Requested status change to " + ns); sent = true; }
    const n = $("f-n").value.trim();
    if (n) note(M ? "manager_remark" : "exec_reply", n);
    dlg.close(); await save(t);
    if (sent) toast("Sent to the Manager for approval");
  };
  if (!dlg.open) dlg.showModal();
}
