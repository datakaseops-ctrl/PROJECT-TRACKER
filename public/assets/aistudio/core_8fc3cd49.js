/* Constants, small helpers and shared state. */

/* In the sheet, a row with a blank "parent" is a PROJECT.
   A row whose "parent" holds a project's id is a TASK of that project. */

const DIVS = ["Administration","Facilities Management","Operations & Strategy","IT"];
const CHIPS = [["All","All"],["Administration","Administration"],["Facilities Management","Facilities"],["Operations & Strategy","Operations & Strategy"],["IT","IT"]];
const STAT = ["Not Started","In Progress","Completed"];
const COL = {"Not Started":"#97a3af","In Progress":"#2f7fd1","Completed":"#2e9e5b"};
const SC = { ...COL, Overdue: "#d64545", "No tasks": "#b8c2cc" };
const DW = 26;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today = (d => new Date(d.getFullYear(), d.getMonth(), d.getDate()))(new Date());
const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const days = (a, b) => Math.round((b - a) / 864e5);
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const D = s => {
  if (!s) return null; s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);          // dd/mm/yyyy
  return m ? new Date(+m[3], m[2] - 1, +m[1]) : null;
};
const fmt = s => { const d = D(s); return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"; };
const rng = x => fmt(x.from) + " to " + fmt(x.to);
const chip = s => `<span class="st" style="background:${SC[s]}">${s}</span>`;
const last = s => (s || "").split("\n").pop();
const byFrom = (a, b) => (a.from || "9").localeCompare(b.from || "9");

let tasks = [], user = null, filter = "All", view = "dash", prev = "dash", cur = null, showT = true;
