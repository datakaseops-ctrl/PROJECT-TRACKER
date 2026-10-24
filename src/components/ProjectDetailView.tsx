import React from 'react';
import { ProjectTask, User, ProjectStats } from '../types';
import { STATUS_COLORS, DISPLAY_STATUS_COLORS } from '../config/constants';
import { formatDateRange, isTaskOverdue } from '../utils/dateUtils';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  Edit3, 
  User as UserIcon, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers 
} from 'lucide-react';

interface ProjectDetailViewProps {
  project: ProjectTask;
  stats: ProjectStats;
  currentUser: User;
  onBack: () => void;
  onEditProject: () => void;
  onAddTask: () => void;
  onOpenTask: (task: ProjectTask) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  stats,
  currentUser,
  onBack,
  onEditProject,
  onAddTask,
  onOpenTask,
}) => {
  const isManager = currentUser.role === 'manager';
  const statusTheme = DISPLAY_STATUS_COLORS[stats.status] || DISPLAY_STATUS_COLORS['Not Started'];

  // Sort tasks: user's assigned tasks first (if executive), then by timeline
  const sortedTasks = [...stats.tasks].sort((a, b) => {
    if (!isManager) {
      const aMine = a.assignee === currentUser.name;
      const bMine = b.assignee === currentUser.name;
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
    }
    return (a.from || '9').localeCompare(b.from || '9');
  });

  return (
    <div className="space-y-6">
      {/* Top Back Action */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Portfolio</span>
      </button>

      {/* Project Overview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {project.division}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusTheme.bg} ${statusTheme.text}`}>
                {stats.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {project.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDateRange(project.from, project.to)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {isManager && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onEditProject}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Project</span>
              </button>
              <button
                onClick={onAddTask}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0e5773] hover:bg-[#0a4359] rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
          )}
        </div>

        {/* Manager Remark / Strategic Context */}
        {project.manager_remark && (
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/70 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Manager Project Brief / Objectives
            </span>
            <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {project.manager_remark}
            </p>
          </div>
        )}

        {/* Progress Metric Strip */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Overall Completion</span>
              <span className="font-mono tabular-nums">{stats.percent}%</span>
            </div>
            {/* Multi-segment Progress Bar */}
            <div className="h-2.5 w-full bg-slate-100 rounded-full flex overflow-hidden">
              {stats.total > 0 && (
                <>
                  <div
                    style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`${stats.completed} Completed`}
                  />
                  <div
                    style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                    className="bg-blue-500 h-full"
                  />
                  <div
                    style={{ width: `${(stats.notStarted / stats.total) * 100}%` }}
                    className="bg-slate-300 h-full"
                  />
                </>
              )}
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-100 sm:pl-4">
            <span className="text-[11px] text-slate-500 font-medium block">Tasks Finished</span>
            <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
              {stats.completed} <span className="text-xs text-slate-400 font-normal">of {stats.total}</span>
            </span>
          </div>

          <div className="sm:border-l sm:border-slate-100 sm:pl-4">
            <span className="text-[11px] text-slate-500 font-medium block">Overdue Tasks</span>
            <span className={`text-base font-bold font-mono tabular-nums ${stats.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {stats.overdue}
            </span>
          </div>
        </div>
      </div>

      {/* Task Breakdown Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Project Task Breakdown ({stats.tasks.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any task row to view details, update progress notes, or submit status changes
            </p>
          </div>

          {isManager && (
            <button
              onClick={onAddTask}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0e5773] hover:bg-[#0a4359] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          )}
        </div>

        {sortedTasks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No tasks assigned yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Break down this project into executable milestones with assignees and due dates.
            </p>
            {isManager && (
              <button
                onClick={onAddTask}
                className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-[#0e5773] hover:bg-[#0a4359] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Task</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/80 font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Assigned Executive</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Latest Communication</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTasks.map((task) => {
                  const isMine = task.assignee === currentUser.name;
                  const isOver = isTaskOverdue(task);
                  const statusInfo = STATUS_COLORS[task.status] || STATUS_COLORS['Not Started'];
                  const pending = task.requested_status && task.requested_status !== task.status;
                  const latestNote = task.exec_reply
                    ? task.exec_reply.split('\n').filter(Boolean).pop()
                    : task.manager_remark
                    ? task.manager_remark.split('\n').filter(Boolean).pop()
                    : '';

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onOpenTask(task)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isMine ? 'bg-sky-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {isMine && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0e5773]" title="Assigned to you" />
                          )}
                          <span>{task.title}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className={isMine ? 'font-semibold text-[#0e5773]' : ''}>
                            {task.assignee || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateRange(task.from, task.to)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                            {task.status}
                          </span>
                          {isOver && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Overdue
                            </span>
                          )}
                          {pending && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-dashed border-amber-300">
                              Pending: {task.requested_status}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={latestNote}>
                        {latestNote ? (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{latestNote}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTask(task);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0e5773] bg-[#0e5773]/10 hover:bg-[#0e5773]/20 rounded transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
