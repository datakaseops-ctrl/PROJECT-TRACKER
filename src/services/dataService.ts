import { ProjectTask, ProjectStats, SheetConfig } from '../types';
import { DEFAULT_CONFIG, TASK_STATUSES } from '../config/constants';
import { parseDate, toIsoDate, isTaskOverdue, getToday } from '../utils/dateUtils';

const CONFIG_KEY = 'divisional_tracker_config';
const CACHE_KEY = 'divisional_tracker_cached_tasks';

export function getStoredConfig(): SheetConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        csvUrl: parsed.csvUrl || DEFAULT_CONFIG.CSV_URL,
        scriptUrl: parsed.scriptUrl || DEFAULT_CONFIG.SCRIPT_URL,
      };
    }
  } catch (e) {
    console.warn('Failed to read config from localStorage', e);
  }
  return {
    csvUrl: DEFAULT_CONFIG.CSV_URL,
    scriptUrl: DEFAULT_CONFIG.SCRIPT_URL,
  };
}

export function saveStoredConfig(cfg: SheetConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('Failed to save config to localStorage', e);
  }
}

export function normalizeRow(r: any): ProjectTask {
  const f = parseDate(r.from);
  const t = parseDate(r.to);
  const status = TASK_STATUSES.includes(r.status) ? r.status : 'Not Started';
  const reqStatus = TASK_STATUSES.includes(r.requested_status) ? r.requested_status : '';

  return {
    id: String(r.id || ''),
    division: r.division || '',
    parent: r.parent ? String(r.parent) : '',
    title: r.title || 'Untitled',
    from: f ? toIsoDate(f) : '',
    to: t ? toIsoDate(t) : '',
    status,
    requested_status: reqStatus,
    assignee: r.assignee || '',
    manager_remark: r.manager_remark || '',
    exec_reply: r.exec_reply || '',
    updated: r.updated || '',
  };
}

// Client-side CSV parser fallback
export function parseCSVClient(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (insideQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      insideQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      lines.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    lines.push(row);
  }

  if (lines.length < 2) return [];
  const headers = lines[0].map(h => h.trim().toLowerCase());
  return lines.slice(1).filter(r => r[0]).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] || '';
    });
    return obj;
  });
}

// Initial fallback mock data if completely offline & uninitialized
const INITIAL_DEMO_TASKS: ProjectTask[] = [
  {
    id: 'P-OPS-01',
    division: 'Operations & Strategy',
    parent: '',
    title: 'Enterprise Process Automation',
    from: '2026-10-01',
    to: '2026-11-30',
    status: 'In Progress',
    requested_status: '',
    assignee: '',
    manager_remark: 'Core strategic priority for Q4. Align with executive leads.',
    exec_reply: '',
    updated: new Date().toISOString()
  },
  {
    id: 'T-OPS-01',
    division: 'Operations & Strategy',
    parent: 'P-OPS-01',
    title: 'Workflow Audit & Bottleneck Analysis',
    from: '2026-10-05',
    to: '2026-10-22',
    status: 'Completed',
    requested_status: '',
    assignee: 'Executive 3',
    manager_remark: '24/10/2026 Manager: Approved completed status.',
    exec_reply: '22/10/2026 Executive 3: Completed departmental mapping.',
    updated: new Date().toISOString()
  },
  {
    id: 'T-OPS-02',
    division: 'Operations & Strategy',
    parent: 'P-OPS-01',
    title: 'Automated Reporting Pipeline Integration',
    from: '2026-10-23',
    to: '2026-11-15',
    status: 'In Progress',
    requested_status: '',
    assignee: 'Executive 3',
    manager_remark: '',
    exec_reply: '24/10/2026 Executive 3: Connectors tested successfully.',
    updated: new Date().toISOString()
  },
  {
    id: 'P-FAC-01',
    division: 'Facilities Management',
    parent: '',
    title: 'Green Energy HVAC Overhaul',
    from: '2026-10-10',
    to: '2026-12-15',
    status: 'In Progress',
    requested_status: '',
    assignee: '',
    manager_remark: 'Approved budget. Ensure vendor compliance.',
    exec_reply: '',
    updated: new Date().toISOString()
  },
  {
    id: 'T-FAC-01',
    division: 'Facilities Management',
    parent: 'P-FAC-01',
    title: 'Chiller Unit Replacement & Air Filtration',
    from: '2026-10-12',
    to: '2026-10-23',
    status: 'In Progress',
    requested_status: 'Completed',
    assignee: 'Executive 2',
    manager_remark: '',
    exec_reply: '24/10/2026 Executive 2: Requested status change to Completed. Installation and pressure testing passed.',
    updated: new Date().toISOString()
  },
  {
    id: 'P-ADM-01',
    division: 'Administration',
    parent: '',
    title: 'Divisional Records Digitalization',
    from: '2026-10-15',
    to: '2026-11-20',
    status: 'Not Started',
    requested_status: '',
    assignee: '',
    manager_remark: 'Coordinate with legal and compliance.',
    exec_reply: '',
    updated: new Date().toISOString()
  },
  {
    id: 'T-ADM-01',
    division: 'Administration',
    parent: 'P-ADM-01',
    title: 'Document Retention Policy Review',
    from: '2026-10-18',
    to: '2026-10-31',
    status: 'Not Started',
    requested_status: '',
    assignee: 'Executive 1',
    manager_remark: '',
    exec_reply: '',
    updated: new Date().toISOString()
  }
];

export async function fetchProjectTasks(config?: SheetConfig): Promise<{ tasks: ProjectTask[]; source: string }> {
  const cfg = config || getStoredConfig();

  // 1. Try Server API Proxy first
  try {
    const params = new URLSearchParams();
    if (cfg.scriptUrl) params.set('scriptUrl', cfg.scriptUrl);
    if (cfg.csvUrl) params.set('csvUrl', cfg.csvUrl);

    const res = await fetch(`/api/sheet/data?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
        const parsed = data.data
          .filter((r: any) => r && r.id != null && String(r.id).trim() !== '')
          .map(normalizeRow);
        
        // Save to local cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
        } catch {}

        return { tasks: parsed, source: data.source || 'server' };
      }
    }
  } catch (err) {
    console.warn('Server proxy fetch failed, trying direct client fetch...', err);
  }

  // 2. Direct client fetch via Apps Script or CSV
  try {
    if (cfg.scriptUrl) {
      const res = await fetch(cfg.scriptUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          const parsed = json
            .filter((r: any) => r && r.id != null && String(r.id).trim() !== '')
            .map(normalizeRow);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
          } catch {}
          return { tasks: parsed, source: 'apps_script_client' };
        }
      }
    }
  } catch (err) {
    console.warn('Direct Apps Script fetch failed:', err);
  }

  try {
    if (cfg.csvUrl) {
      const res = await fetch(`${cfg.csvUrl}&_t=${Date.now()}`);
      if (res.ok) {
        const text = await res.text();
        const rows = parseCSVClient(text);
        if (rows.length > 0) {
          const parsed = rows.map(normalizeRow);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
          } catch {}
          return { tasks: parsed, source: 'csv_client' };
        }
      }
    }
  } catch (err) {
    console.warn('Direct CSV fetch failed:', err);
  }

  // 3. Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { tasks: parsed.map(normalizeRow), source: 'local_cache' };
      }
    }
  } catch {}

  // 4. Fallback to demo starter data
  return { tasks: INITIAL_DEMO_TASKS, source: 'demo_data' };
}

export async function saveTaskToSheet(task: ProjectTask, config?: SheetConfig): Promise<{ success: boolean; message: string }> {
  const cfg = config || getStoredConfig();
  task.updated = new Date().toISOString();

  // Update local cache immediately
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    let items: ProjectTask[] = cached ? JSON.parse(cached) : [];
    const idx = items.findIndex(t => t.id === task.id);
    if (idx >= 0) {
      items[idx] = task;
    } else {
      items.push(task);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {}

  // 1. Try server proxy save
  try {
    const res = await fetch('/api/sheet/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: cfg.scriptUrl,
        data: task,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ok) {
        return { success: true, message: 'Changes saved successfully' };
      }
    }
  } catch (err) {
    console.warn('Server proxy save failed, trying direct post...', err);
  }

  // 2. Direct client POST with no-cors fallback
  if (cfg.scriptUrl) {
    try {
      await fetch(cfg.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(task),
      });
      return { success: true, message: 'Changes saved successfully' };
    } catch (err: any) {
      return { success: false, message: 'Save error: ' + (err.message || 'Network error') };
    }
  }

  return { success: true, message: 'Changes saved locally' };
}

export function computeProjectStats(project: ProjectTask, allItems: ProjectTask[]): ProjectStats {
  const tasks = allItems.filter(x => x.parent === project.id);
  const total = tasks.length;
  const completed = tasks.filter(x => x.status === 'Completed').length;
  const inProgress = tasks.filter(x => x.status === 'In Progress').length;
  const notStarted = total - completed - inProgress;
  const overdue = tasks.filter(isTaskOverdue).length;

  const projectToDate = parseDate(project.to);
  const isProjOverdue = projectToDate ? projectToDate < getToday() && project.status !== 'Completed' : false;

  let status: ProjectStats['status'] = 'Not Started';
  if (total === 0) {
    status = 'No tasks';
  } else if (completed === total) {
    status = 'Completed';
  } else if (overdue > 0 || isProjOverdue) {
    status = 'Overdue';
  } else if (inProgress > 0 || completed > 0) {
    status = 'In Progress';
  }

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    tasks,
    total,
    completed,
    inProgress,
    notStarted,
    overdue,
    percent,
    status,
  };
}
