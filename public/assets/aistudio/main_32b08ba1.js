/* Start-up: auto refresh and restoring the signed-in user. */

/* ---------- start ---------- */
setInterval(() => { if (user && !$("dlg").open) load(); }, 60000);
(function () {
  let i = null; try { i = sessionStorage.getItem("u"); } catch (e) {}
  CONFIG.USERS[i] ? start(CONFIG.USERS[i]) : showLogin();
})();
