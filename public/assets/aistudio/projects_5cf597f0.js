/* Project and task calculations: progress, status, what each user can see. */

/* ---------- project maths ---------- */
const kids = id => tasks.filter(x => x.parent === id);
const execsFor = dv => CONFIG.USERS.filter(u => u.role === "executive" && (u.divisions || []).includes(dv)).map(u => u.name);
const isOver = x => { const t = D(x.to); return !!t && t < today && x.status !== "Completed"; };
const inDiv = x => filter === "All" || (filter === "Administration" ? x.division === "Administration" || x.division === "Facilities Management" : x.division === filter);
function stats(p) {
  const k = kids(p.id), n = k.length, c = k.filter(x => x.status === "Completed").length,
    ip = k.filter(x => x.status === "In Progress").length, od = k.filter(isOver).length, pt = D(p.to);
  const st = !n ? "No tasks" : c === n ? "Completed" : (od || (pt && pt < today)) ? "Overdue" : (ip || c) ? "In Progress" : "Not Started";
  return { k, n, c, ip, ns: n - c - ip, od, pct: n ? Math.round(100 * c / n) : 0, st };
}
function vprojects() {
  let p = tasks.filter(x => !x.parent);
  if (user.role === "executive") p = p.filter(x => (user.divisions || []).includes(x.division) || kids(x.id).some(k => k.assignee === user.name));
  return p.filter(inDiv).sort((a, b) => DIVS.indexOf(a.division) - DIVS.indexOf(b.division) || byFrom(a, b));
}
const sb = s => s.n ? `<div class="sb" title="${s.c} done, ${s.ip} in progress, ${s.ns} not started"><i style="width:${100 * s.c / s.n}%;background:${COL.Completed}"></i><i style="width:${100 * s.ip / s.n}%;background:${COL["In Progress"]}"></i><i style="width:${100 * s.ns / s.n}%;background:${COL["Not Started"]}"></i></div>` : `<div class="sb"></div>`;
function span(p) {
  const k = kids(p.id).filter(x => D(x.from) && D(x.to)); let f = D(p.from), t = D(p.to);
  if (!f && k.length) f = new Date(Math.min(...k.map(x => +D(x.from))));
  if (!t && k.length) t = new Date(Math.max(...k.map(x => +D(x.to))));
  return [f, t];
}
