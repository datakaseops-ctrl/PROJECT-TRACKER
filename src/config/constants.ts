import { User, TaskStatus, DisplayStatus } from '../types';

export const DIVISIONS = [
  "Administration",
  "Facilities Management",
  "Operations & Strategy",
  "IT"
] as const;

export const DEFAULT_USERS: User[] = [
  { name: "Manager", role: "manager", pin: "1234" },
  { name: "Executive 1", role: "executive", pin: "1111", divisions: ["Administration"] },
  { name: "Executive 2", role: "executive", pin: "2222", divisions: ["Facilities Management"] },
  { name: "Executive 3", role: "executive", pin: "3333", divisions: ["Operations & Strategy", "IT"] }
];

export const TASK_STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Completed"];

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; hex: string; border: string }> = {
  "Not Started": { bg: "bg-slate-100", text: "text-slate-700", hex: "#94a3af", border: "border-slate-300" },
  "In Progress": { bg: "bg-blue-50", text: "text-blue-700", hex: "#2563eb", border: "border-blue-300" },
  "Completed": { bg: "bg-emerald-50", text: "text-emerald-700", hex: "#16a34a", border: "border-emerald-300" },
};

export const DISPLAY_STATUS_COLORS: Record<DisplayStatus, { bg: string; text: string; hex: string }> = {
  "Not Started": { bg: "bg-slate-100", text: "text-slate-700", hex: "#94a3af" },
  "In Progress": { bg: "bg-blue-50", text: "text-blue-700", hex: "#2563eb" },
  "Completed": { bg: "bg-emerald-50", text: "text-emerald-700", hex: "#16a34a" },
  "Overdue": { bg: "bg-rose-50", text: "text-rose-700", hex: "#dc2626" },
  "No tasks": { bg: "bg-slate-100", text: "text-slate-500", hex: "#cbd5e1" },
};

export const DEFAULT_CONFIG = {
  CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9RHKZ8DMDbCnUetowUM5X46nojL_zHtOE8OH7PMXvt7sH1ay3CZiKJ-9F7trKbwiJTWfYYF9T1wgU/pub?output=csv",
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwLTVcv2eDSsgnmTrOqOIrxhdXEtMdxBep_JSu_7Oxm94jyVCFS6JXqiATz9u5_dMBJCQ/exec",
};
