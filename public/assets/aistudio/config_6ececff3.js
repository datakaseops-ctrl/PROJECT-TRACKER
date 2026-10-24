/* Settings: sheet link, Apps Script link, users and the divisions each executive looks after. */

/* ===== SETTINGS: edit this block only ===== */
const CONFIG = {
  CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9RHKZ8DMDbCnUetowUM5X46nojL_zHtOE8OH7PMXvt7sH1ay3CZiKJ-9F7trKbwiJTWfYYF9T1wgU/pub?output=csv",
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwLTVcv2eDSsgnmTrOqOIrxhdXEtMdxBep_JSu_7Oxm94jyVCFS6JXqiATz9u5_dMBJCQ/exec",
  // Each executive looks after the divisions listed here. Their name is what gets written to the "assignee" column.
  USERS: [
    { name: "Manager",     role: "manager",   pin: "1234" },
    { name: "Executive 1", role: "executive", pin: "1111", divisions: ["Administration"] },
    { name: "Executive 2", role: "executive", pin: "2222", divisions: ["Facilities Management"] },
    { name: "Executive 3", role: "executive", pin: "3333", divisions: ["Operations & Strategy", "IT"] }
  ]
};
/* ========================================= */
