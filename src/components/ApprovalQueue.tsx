import React from 'react';
import { ProjectTask } from '../types';
import { Check, X, ArrowRight, UserCircle, MessageSquare } from 'lucide-react';

interface ApprovalQueueProps {
  pendingTasks: ProjectTask[];
  allProjects: ProjectTask[];
  onApprove: (task: ProjectTask) => void;
  onReject: (task: ProjectTask) => void;
  onOpenTask: (task: ProjectTask) => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  pendingTasks,
  allProjects,
  onApprove,
  onReject,
  onOpenTask,
}) => {
  if (pendingTasks.length === 0) return null;

  const projectMap = new Map<string, ProjectTask>();
  allProjects.forEach(p => projectMap.set(p.id, p));

  return (
    <div className="mb-6 bg-amber-50/60 border border-amber-200 rounded-xl p-4.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            Status Change Approvals Required ({pendingTasks.length})
          </h2>
        </div>
        <span className="text-xs text-amber-900 font-medium">
          Executive submissions awaiting manager sign-off
        </span>
      </div>

      <div className="overflow-x-auto border border-amber-200/80 rounded-lg bg-white shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-semibold text-slate-600">
            <tr>
              <th className="py-2.5 px-3.5">Task</th>
              <th className="py-2.5 px-3.5">Project & Division</th>
              <th className="py-2.5 px-3.5">Submitted By</th>
              <th className="py-2.5 px-3.5">Status Transition</th>
              <th className="py-2.5 px-3.5">Latest Update Note</th>
              <th className="py-2.5 px-3.5 text-right">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendingTasks.map((task) => {
              const project = projectMap.get(task.parent);
              const latestNote = task.exec_reply
                ? task.exec_reply.split('\n').filter(Boolean).pop()
                : '';

              return (
                <tr 
                  key={task.id} 
                  className="hover:bg-amber-50/30 transition-colors"
                >
                  <td className="py-3 px-3.5 font-medium text-slate-900">
                    <button
                      onClick={() => onOpenTask(task)}
                      className="text-left hover:text-[#0e5773] hover:underline cursor-pointer"
                    >
                      {task.title}
                    </button>
                  </td>
                  <td className="py-3 px-3.5 text-slate-600">
                    <div>{project?.title || 'Unknown Project'}</div>
                    <div className="text-[11px] text-slate-400">{task.division}</div>
                  </td>
                  <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>{task.assignee || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-slate-600">{task.status}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-emerald-700 font-semibold">{task.requested_status}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate" title={latestNote}>
                    {latestNote ? (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{latestNote}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onReject(task)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Reject status change"
                      >
                        <X className="w-3.5 h-3.5 inline mr-1 text-rose-600" />
                        Reject
                      </button>
                      <button
                        onClick={() => onApprove(task)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-2xs cursor-pointer"
                        title="Approve status change"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" />
                        Approve
                      </button>
                    </div>
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
