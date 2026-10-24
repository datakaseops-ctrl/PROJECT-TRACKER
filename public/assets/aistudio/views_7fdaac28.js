/* Screens: dashboard, project page and Gantt chart. */

/* ---------- screens ---------- */
function render() {
  if (!user) return;
  const M = user.role === "manager", dv = user.divisions || [];
  const chips = M ? CHIPS : dv.length > 1 ? [CHIPS[0]].concat(CHIPS.filter(c => dv.includes(c[0]))) : [];
  $("bar").innerHTML = (M ? `<button class="tab${view === "dash" ? " on" : ""}" data-v="dash">Dashboard</button><button class="tab${view === "gantt" ? " on" : ""}" data-v="gantt">Gantt chart</button><span class="sep"></span>` : "")
    + chips.map(c => `<button class="chip${filter === c[0] ? " on" : ""}" data-f="${esc(c[0])}">${esc(c[1])}</button>`).join("")
    + (view === "gantt" ? `<span class="lg"><label style="margin:0"><input type="checkbox" id="shT"${showT ? " checked" : ""}> Show tasks</label>${STAT.map(s => `<span><i style="background:${COL[s]}"></i>${s}</span>`).join("")}<span><i style="background:#d64545"></i>Overdue</span></span>` : "");
  $("bar").hidden = view === "project" || !$("bar").innerHTML;
  ({ dash: renderDash, gantt: renderGantt, project: renderProject })[view]();
}
$("bar").onclick = e => {
  const b = e.target.closest("[data-f],[data-v]"); if (!b) return;
  if (b.dataset.f) filter = b.dataset.f;
  if (b.dataset.v) view = b.dataset.v;
  render();
};
$("bar").onchange = e => { if (e.target.id === "shT") { showT = e.target.checked; render(); } };
$("main").onclick = e => {
  const T = e.target.closest("[data-t]"); if (T) return openTask(T.dataset.t);
  const P = e.target.closest("[data-p]");
  if (P) { prev = view; cur = P.dataset.p; view = "project"; render(); scrollTo(0, 0); return; }
  const id = e.target.id;
  if (id === "bk") { view = prev; render(); }
  else if (id === "ep") editProject(cur);
  else if (id === "at") openTask(null, cur);
};

/* Dashboard (manager) / My projects (executive) */
function renderDash() {
  const M = user.role === "manager", P = vprojects();
  let my = P.flatMap(p => kids(p.id)); if (!M) my = my.filter(x => x.assignee === user.name);
  const n = s => my.filter(x => x.status === s).length;
  const od = my.filter(isOver).sort((a, b) => a.to.localeCompare(b.to));
  const pend = M ? my.filter(x => x.requested_status && x.requested_status !== x.status) : [];
  const kp = [[P.length, M ? "Projects" : "My projects"], [my.length, M ? "Tasks" : "My tasks"], [n("Completed"), "Completed"], [n("In Progress"), "In progress"], [n("Not Started"), "Not started"]].concat(M ? [[pend.length, "Awaiting approval"]] : [], [[od.length, "Overdue"]]);
  let h = `<div class="kp">${kp.map(k => `<div><b${k[1] === "Overdue" && k[0] ? ' style="color:#d64545"' : ""}>${k[0]}</b><span>${k[1]}</span></div>`).join("")}</div>`;
  if (pend.length) h += `<h2 class="sec" style="margin-top:0">Awaiting your approval</h2><div class="card"><table class="tb"><thead><tr><th>Task<th>Project<th>Requested by<th>Status change</tr></thead><tbody>`
    + pend.map(x => { const p = tasks.find(y => y.id === x.parent);
      return `<tr data-t="${esc(x.id)}"><td><b>${esc(x.title)}</b><td>${esc(p ? p.title : "")}<td>${esc(x.assignee)}<td>${chip(x.status)} to ${chip(x.requested_status)}</tr>`; }).join("")
    + `</tbody></table></div>`;
  if (!P.length) h += `<div class="empty card">${M ? "No projects yet. Select New project to start." : "No projects have been assigned to you yet."}</div>`;
  else h += `<div class="card"><table class="tb"><thead><tr><th>Project<th>Division<th>Timeline<th>Progress<th>Tasks done${M ? "" : "<th>Your tasks"}<th>Status</tr></thead><tbody>`
    + P.map(p => { const s = stats(p);
      return `<tr data-p="${esc(p.id)}"><td><b>${esc(p.title)}</b><td>${esc(p.division)}<td>${rng(p)}<td>${sb(s)}<td>${s.c} of ${s.n}${s.od ? ` <span style="color:#d64545">(${s.od} overdue)</span>` : ""}${M ? "" : `<td>${s.k.filter(x => x.assignee === user.name).length}`}<td>${chip(s.st)}</tr>`; }).join("")
    + `</tbody></table></div>`;
  if (od.length) h += `<h2 class="sec">Overdue tasks</h2><div class="card"><table class="tb"><thead><tr><th>Task<th>Project<th>Assigned to<th>Due</tr></thead><tbody>`
    + od.slice(0, 10).map(x => { const p = tasks.find(y => y.id === x.parent);
      return `<tr data-t="${esc(x.id)}"><td>${esc(x.title)}<td>${esc(p ? p.title : "")}<td>${esc(x.assignee)}<td>${fmt(x.to)}</tr>`; }).join("")
    + `</tbody></table></div>`;
  $("main").innerHTML = h;
}

/* One project with its tasks */
function renderProject() {
  const M = user.role === "manager", p = tasks.find(x => x.id === cur && !x.parent);
  if (!p) { view = "dash"; return render(); }
  const s = stats(p), me = x => x.assignee === user.name;
  const ks = s.k.slice().sort((a, b) => (M ? 0 : me(b) - me(a)) || byFrom(a, b));
  $("main").innerHTML = `<button id="bk" style="margin-top:10px">Back</button>
    <div class="ph"><h2>${esc(p.title)}</h2>
      <div class="mu">${esc(p.division)}, ${rng(p)}</div>
      ${p.manager_remark ? `<p style="margin:8px 0 0">${esc(p.manager_remark)}</p>` : ""}
      <div class="pp">${sb(s)}<span>${s.c} of ${s.n} tasks completed</span>${chip(s.st)}</div>
      ${M ? `<div class="pa"><button id="ep">Edit project</button><button class="p" id="at">Add task</button></div>` : ""}</div>`
    + (ks.length ? `<div class="card"><table class="tb"><thead><tr><th>Task<th>Assigned to<th>Timeline<th>Status<th>Latest update</tr></thead><tbody>`
      + ks.map(x => `<tr data-t="${esc(x.id)}"${me(x) ? ' class="me"' : ""}><td><b>${esc(x.title)}</b><td>${x.assignee ? esc(x.assignee) : '<span class="mu">Unassigned</span>'}<td>${rng(x)}<td>${chip(x.status)}${isOver(x) ? " " + chip("Overdue") : ""}${x.requested_status && x.requested_status !== x.status ? ` <span class="pn">Pending: ${esc(x.requested_status)}</span>` : ""}<td class="ut" title="${esc(last(x.exec_reply))}">${esc(last(x.exec_reply))}</tr>`).join("")
      + `</tbody></table></div>`
      : `<div class="empty card">No tasks yet.${M ? " Select Add task." : ""}</div>`);
}

/* Gantt (manager): projects with their tasks */
function renderGantt() {
  const P = vprojects(), old = document.querySelector(".gw");
  if (!P.length) { $("main").innerHTML = '<div class="empty card">No projects yet. Select New project to start.</div>'; return; }
  let s = today, e = today;
  const ext = (f, t) => { if (f && f < s) s = f; if (t && t > e) e = t; };
  P.forEach(p => { const [f, t] = span(p); ext(f, t); kids(p.id).forEach(k => ext(D(k.from), D(k.to))); });
  s = add(s, -3); e = add(e, 10);
  if (days(s, e) < 45) e = add(s, 45);
  const N = days(s, e) + 1, W = N * DW, ms = [];
  for (let i = 0; i < N; i++) { const d = add(s, i); if (i === 0 || d.getDate() === 1) ms.push([i, d.toLocaleString("en", { month: "short", year: "numeric" })]); }
  const mo = ms.map((m, k) => `<div class="mo" style="left:${m[0] * DW}px;width:${((ms[k + 1] ? ms[k + 1][0] : N) - m[0]) * DW}px">${m[1]}</div>`).join("");
  let dd = "";
  for (let i = 0; i < N; i++) { const d = add(s, i); dd += `<span${+d === +today ? ' style="color:#d64545;font-weight:700"' : ""}>${d.getDate()}</span>`; }
  const R = (lbl, tip, cls, attr, bar) => `<div class="r"><div class="l ${cls}" ${attr} title="${esc(tip)}">${lbl}</div><div class="t" style="width:${W}px" ${attr}>${bar}</div></div>`;
  const pos = (f, t) => `left:${days(s, f) * DW}px;width:${(days(f, t) + 1) * DW - 2}px`;
  let body = "";
  const divs = DIVS.concat(P.some(p => !DIVS.includes(p.division)) ? ["Other"] : []);
  divs.forEach(dv => {
    const list = P.filter(p => dv === "Other" ? !DIVS.includes(p.division) : p.division === dv);
    if (!list.length) return;
    body += `<div class="r dv"><div class="l">${dv === "Facilities Management" ? "Administration: Facilities Management" : esc(dv)}</div><div class="t" style="width:${W}px"></div></div>`;
    list.forEach(p => {
      const [f, t] = span(p), st = stats(p), c = SC[st.st], a = `data-p="${esc(p.id)}"`;
      const pb = f && t ? `<div class="b pj" style="${pos(f, t)};background:${c}33;border:1px solid ${c}" title="${esc(p.title)}: ${st.pct}% complete, ${st.st}"><i class="pf" style="width:${st.pct}%;background:${c}aa"></i><span>${esc(p.title)}</span></div>` : "";
      body += R(`${esc(p.title)} <span class="mu">${st.pct}%</span>`, p.title, "pl", a, pb);
      if (showT) st.k.slice().sort(byFrom).forEach(x => {
        const xf = D(x.from), xt = D(x.to), od = isOver(x);
        const xb = xf && xt ? `<div class="b" style="${pos(xf, xt)};background:${od ? "#d64545" : COL[x.status]}" title="${esc(x.title)}: ${x.from} to ${x.to}, ${x.status}${od ? ", overdue" : ""}">${esc(x.assignee)}</div>` : "";
        body += R(esc(x.title), x.title, "s", `data-t="${esc(x.id)}"`, xb);
      });
    });
  });
  const tl = e >= today && s <= today ? `<div class="td" style="left:${250 + days(s, today) * DW + DW / 2}px"></div>` : "";
  $("main").innerHTML = `<div class="gw"><div class="g" style="width:${250 + W}px"><div class="h r"><div class="l">Project and tasks</div><div class="t" style="width:${W}px">${mo}<div class="dd">${dd}</div></div></div>${body}${tl}</div></div>`;
  const gw = document.querySelector(".gw");
  if (old) { gw.scrollLeft = old.scrollLeft; gw.scrollTop = old.scrollTop; }
  else gw.scrollLeft = Math.max(0, days(s, today) * DW - 160);
}
