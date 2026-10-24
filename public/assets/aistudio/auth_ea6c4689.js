/* Sign in and sign out. */

/* ---------- login ---------- */
function showLogin() {
  $("app").hidden = true; $("login").hidden = false;
  $("lu").innerHTML = CONFIG.USERS.map((u, i) => `<option value="${i}">${esc(u.name)} (${u.role})</option>`).join("");
  $("lp").value = "";
}
function signIn() {
  const u = CONFIG.USERS[+$("lu").value];
  if (!u || $("lp").value !== u.pin) return toast("Wrong PIN");
  try { sessionStorage.setItem("u", $("lu").value); } catch (e) {}
  start(u);
}
function start(u) {
  user = u; view = "dash"; prev = "dash"; cur = null; filter = "All";
  $("login").hidden = true; $("app").hidden = false;
  $("who").textContent = u.name; $("new").hidden = u.role !== "manager";
  load();
}
$("lgo").onclick = signIn;
$("lp").onkeydown = e => { if (e.key === "Enter") signIn(); };
$("out").onclick = () => { try { sessionStorage.removeItem("u"); } catch (e) {} user = null; showLogin(); };
$("ref").onclick = () => { load(); toast("Refreshed"); };
$("new").onclick = () => editProject();
