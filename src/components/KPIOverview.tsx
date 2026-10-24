import React from 'react';
import { User } from '../types';
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  CircleDot, 
  AlertTriangle, 
  Inbox
} from 'lucide-react';

interface KPIOverviewProps {
  currentUser: User;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  pendingApprovals: number;
  overdueTasks: number;
  onFilterPending?: () => void;
  onFilterOverdue?: () => void;
}

export const KPIOverview: React.FC<KPIOverviewProps> = ({
  currentUser,
  totalProjects,
  totalTasks,
  completedTasks,
  inProgressTasks,
  notStartedTasks,
  pendingApprovals,
  overdueTasks,
}) => {
  const isManager = currentUser.role === 'manager';

  const cards = [
    {
      label: isManager ? 'Total Projects' : 'Assigned Projects',
      value: totalProjects,
      icon: FolderKanban,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
    },
    {
      label: isManager ? 'Active Tasks' : 'My Tasks',
      value: totalTasks,
      icon: CircleDot,
      color: 'text-slate-900',
      bg: 'bg-white',
      border: 'border-slate-200',
    },
    {
      label: 'Completed',
      value: completedTasks,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-white',
      border: 'border-slate-200',
    },
    {
      label: 'In Progress',
      value: inProgressTasks,
      icon: Clock,
      color: 'text-blue-700',
      bg: 'bg-white',
      border: 'border-slate-200',
    },
    {
      label: 'Not Started',
      value: notStartedTasks,
      icon: CircleDot,
      color: 'text-slate-600',
      bg: 'bg-white',
      border: 'border-slate-200',
    },
    ...(isManager ? [{
      label: 'Awaiting Approval',
      value: pendingApprovals,
      icon: Inbox,
      color: pendingApprovals > 0 ? 'text-amber-700' : 'text-slate-600',
      bg: pendingApprovals > 0 ? 'bg-amber-50/50' : 'bg-white',
      border: pendingApprovals > 0 ? 'border-amber-200' : 'border-slate-200',
    }] : []),
    {
      label: 'Overdue',
      value: overdueTasks,
      icon: AlertTriangle,
      color: overdueTasks > 0 ? 'text-rose-700' : 'text-slate-600',
      bg: overdueTasks > 0 ? 'bg-rose-50/50' : 'bg-white',
      border: overdueTasks > 0 ? 'border-rose-200' : 'border-slate-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`${c.bg} ${c.border} border rounded-lg p-3.5 transition-all shadow-2xs`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium text-slate-600 truncate">{c.label}</span>
              <Icon className={`w-4 h-4 shrink-0 ${c.color} opacity-80`} />
            </div>
            <div className={`text-2xl font-bold tracking-tight tabular-nums ${c.color}`}>
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};
