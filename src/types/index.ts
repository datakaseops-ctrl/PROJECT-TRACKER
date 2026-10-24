export type UserRole = 'manager' | 'executive';

export interface User {
  name: string;
  role: UserRole;
  pin: string;
  divisions?: string[];
}

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type DisplayStatus = TaskStatus | 'Overdue' | 'No tasks';

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ProjectTask {
  id: string;
  division: string;
  parent: string; // empty string for projects, parent project id for tasks
  title: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  status: TaskStatus;
  requested_status?: TaskStatus | '';
  assignee: string;
  manager_remark: string;
  exec_reply: string;
  updated?: string;
  attachments?: TaskAttachment[];
}

export interface ProjectStats {
  tasks: ProjectTask[];
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  percent: number;
  status: DisplayStatus;
}

export type AppView = 'dashboard' | 'gantt' | 'project-detail' | 'settings' | 'guide';

export interface SheetConfig {
  csvUrl: string;
  scriptUrl: string;
}
