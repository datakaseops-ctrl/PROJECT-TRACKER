import React from 'react';
import { ProjectTask, User, ProjectStats } from '../types';
import { DIVISIONS, STATUS_COLORS, DISPLAY_STATUS_COLORS } from '../config/constants';
import { formatDateRange } from '../utils/dateUtils';
import { Search, Plus, Calendar, AlertCircle, ChevronRight, Layers } from 'lucide-react';

interface ProjectTableProps {
  projects: { project: ProjectTask; stats: ProjectStats }[];
  currentUser: User;
  selectedDivision: string;
  onSelectDivision: (div: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectProject: (projectId: string) => void;
  onEditProject: (projectId: string) => void;
  onAddTask: (projectId: string) => void;
  onNewProject: () => void;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  currentUser,
  selectedDivision,
  onSelectDivision,
  searchQuery,
  onSearchChange,
  onSelectProject,
  onEditProject,
  onAddTask,
  onNewProject,
}) => {
  const isManager = currentUser.role === 'manager';
  const userDivisions = currentUser.divisions || [];

  // Filter division tabs available to current user
  const availableDivisions = isManager 
    ? ['All', ...DIVISIONS]
    : ['All', ...DIVISIONS.filter(d => userDivisions.includes(d))];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden mb-6">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Division Filter Chips (Functional segmented buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {availableDivisions.map((div) => {
            const isSelected = selectedDivision === div;
            return (
              <button
                key={div}
                onClick={() => onSelectDivision(div)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#0e5773] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {div}
              </button>
            );
          })}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter by title or note..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0e5773] focus:border-[#0e5773]"
            />
          </div>

          {isManager && (
            <button
              onClick={onNewProject}
              className="sm:hidden px-3 py-1.5 text-xs font-semibold text-white bg-[#0e5773] rounded-lg shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects List / Table */}
      {projects.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No projects found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No projects match your current search query. Try clearing the search.'
              : isManager
              ? 'Get started by creating your first divisional project.'
              : 'No projects have been assigned under your division yet.'}
          </p>
          {isManager && !searchQuery && (
            <button
              onClick={onNewProject}
              className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-[#0e5773] hover:bg-[#0a4359] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50/80 font-semibold text-slate-600">
              <tr>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Timeline</th>
                <th className="py-3 px-4 min-w-[160px]">Progress Distribution</th>
                <th className="py-3 px-4">Tasks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map(({ project, stats }) => {
                const statusTheme = DISPLAY_STATUS_COLORS[stats.status] || DISPLAY_STATUS_COLORS['Not Started'];

                return (
                  <tr
                    key={project.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#0e5773] transition-colors flex items-center gap-1.5">
                        <span>{project.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      {project.manager_remark && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-md">
                          {project.manager_remark}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {project.division}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateRange(project.from, project.to)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {stats.total > 0 ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-mono text-slate-500">
                            <span>{stats.percent}% done</span>
                            <span>{stats.completed}/{stats.total} tasks</span>
                          </div>
                          {/* Segmented Progress Bar */}
                          <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden">
                            <div
                              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                              className="bg-emerald-500 h-full transition-all duration-300"
                              title={`${stats.completed} Completed`}
                            />
                            <div
                              style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                              className="bg-blue-500 h-full transition-all duration-300"
                              title={`${stats.inProgress} In Progress`}
                            />
                            <div
                              style={{ width: `${(stats.notStarted / stats.total) * 100}%` }}
                              className="bg-slate-300 h-full transition-all duration-300"
                              title={`${stats.notStarted} Not Started`}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No tasks created</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums">
                      <div className="text-slate-700">
                        {stats.completed} of {stats.total}
                      </div>
                      {stats.overdue > 0 && (
                        <div className="text-rose-600 font-semibold flex items-center gap-1 text-[11px] mt-0.5">
                          <AlertCircle className="w-3 h-3" />
                          <span>{stats.overdue} overdue</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusTheme.bg} ${statusTheme.text}`}>
                        {stats.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {isManager && (
                          <button
                            onClick={() => onAddTask(project.id)}
                            className="px-2 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-medium transition-colors"
                            title="Add task to project"
                          >
                            + Task
                          </button>
                        )}
                        {isManager && (
                          <button
                            onClick={() => onEditProject(project.id)}
                            className="px-2 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-medium transition-colors"
                            title="Edit project details"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => onSelectProject(project.id)}
                          className="px-2.5 py-1 text-[#0e5773] bg-[#0e5773]/10 hover:bg-[#0e5773]/20 rounded text-xs font-semibold transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
