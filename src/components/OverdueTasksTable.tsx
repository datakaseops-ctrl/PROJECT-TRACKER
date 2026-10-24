import React from 'react';
import { ProjectTask } from '../types';
import { formatDate } from '../utils/dateUtils';
import { AlertTriangle, Calendar, User, ArrowUpRight } from 'lucide-react';

interface OverdueTasksTableProps {
  overdueTasks: ProjectTask[];
  allProjects: ProjectTask[];
  onOpenTask: (task: ProjectTask) => void;
}

export const OverdueTasksTable: React.FC<OverdueTasksTableProps> = ({
  overdueTasks,
  allProjects,
  onOpenTask,
}) => {
  if (overdueTasks.length === 0) return null;

  const projectMap = new Map<string, ProjectTask>();
  allProjects.forEach(p => projectMap.set(p.id, p));

  return (
    <div className="bg-white border border-rose-200 rounded-xl shadow-2xs overflow-hidden mb-6">
      <div className="p-4 bg-rose-50/50 border-b border-rose-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <h3 className="text-sm font-semibold text-rose-950">
            Overdue Tasks Requiring Attention ({overdueTasks.length})
          </h3>
        </div>
        <span className="text-xs text-rose-700 font-medium">
          Target completion date has passed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-600">
            <tr>
              <th className="py-2.5 px-4">Task Name</th>
              <th className="py-2.5 px-4">Project</th>
              <th className="py-2.5 px-4">Division</th>
              <th className="py-2.5 px-4">Assigned To</th>
              <th className="py-2.5 px-4">Due Date</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {overdueTasks.slice(0, 10).map((task) => {
              const project = projectMap.get(task.parent);

              return (
                <tr
                  key={task.id}
                  className="hover:bg-rose-50/20 transition-colors cursor-pointer"
                  onClick={() => onOpenTask(task)}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {task.title}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {project?.title || 'Unknown Project'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {task.division}
                  </td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{task.assignee || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-rose-700 font-medium whitespace-nowrap font-mono tabular-nums">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(task.to)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTask(task);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 rounded inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Resolve</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
