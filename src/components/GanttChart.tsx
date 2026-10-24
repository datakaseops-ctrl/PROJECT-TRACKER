import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProjectTask, User } from '../types';
import { DIVISIONS, STATUS_COLORS, DISPLAY_STATUS_COLORS } from '../config/constants';
import { parseDate, toIsoDate, addDays, daysDiff, getToday, formatDate, isTaskOverdue } from '../utils/dateUtils';
import { computeProjectStats } from '../services/dataService';
import { 
  Calendar, 
  ChevronRight, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  LocateFixed, 
  Layers, 
  HelpCircle 
} from 'lucide-react';

interface GanttChartProps {
  tasks: ProjectTask[];
  currentUser: User;
  onOpenProject: (projectId: string) => void;
  onOpenTask: (taskId: string) => void;
  onNewProject: () => void;
}

const DAY_WIDTH = 28; // width of each day column in pixels

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  currentUser,
  onOpenProject,
  onOpenTask,
  onNewProject,
}) => {
  const [showTasks, setShowTasks] = useState<boolean>(true);
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [collapsedDivs, setCollapsedDivs] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const isManager = currentUser.role === 'manager';
  const today = getToday();

  // Filter projects by user permissions & division
  const allProjects = useMemo(() => {
    let p = tasks.filter(x => !x.parent);
    if (!isManager) {
      const userDivs = currentUser.divisions || [];
      p = p.filter(x => userDivs.includes(x.division) || tasks.some(t => t.parent === x.id && t.assignee === currentUser.name));
    }
    if (selectedDivision !== 'All') {
      p = p.filter(x => x.division === selectedDivision);
    }
    return p;
  }, [tasks, isManager, currentUser, selectedDivision]);

  // Compute date timeline boundaries (min and max date)
  const { startDate, endDate, totalDays } = useMemo(() => {
    let minD: Date = today;
    let maxD: Date = today;

    tasks.forEach(t => {
      const f = parseDate(t.from);
      const to = parseDate(t.to);
      if (f && f < minD) minD = f;
      if (to && to > maxD) maxD = to;
    });

    // Add padding
    const start = addDays(minD, -4);
    let end = addDays(maxD, 14);

    if (daysDiff(start, end) < 45) {
      end = addDays(start, 45);
    }

    const count = daysDiff(start, end) + 1;
    return { startDate: start, endDate: end, totalDays: count };
  }, [tasks, today]);

  // Generate month groupings and days
  const { months, days } = useMemo(() => {
    const dList: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      dList.push(addDays(startDate, i));
    }

    const mList: { label: string; startIndex: number; dayCount: number }[] = [];
    let currentMonth = -1;
    let currentStartIndex = 0;
    let currentLabel = '';

    dList.forEach((d, idx) => {
      const m = d.getMonth();
      if (m !== currentMonth) {
        if (currentMonth !== -1) {
          mList.push({
            label: currentLabel,
            startIndex: currentStartIndex,
            dayCount: idx - currentStartIndex,
          });
        }
        currentMonth = m;
        currentStartIndex = idx;
        currentLabel = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      }
    });

    if (currentStartIndex < dList.length) {
      mList.push({
        label: currentLabel,
        startIndex: currentStartIndex,
        dayCount: dList.length - currentStartIndex,
      });
    }

    return { months: mList, days: dList };
  }, [startDate, totalDays]);

  // Scroll to today on initial mount
  useEffect(() => {
    if (containerRef.current) {
      const todayOffset = daysDiff(startDate, today);
      if (todayOffset >= 0 && todayOffset < totalDays) {
        const scrollTarget = todayOffset * DAY_WIDTH - 240;
        containerRef.current.scrollLeft = Math.max(0, scrollTarget);
      }
    }
  }, [startDate, today, totalDays]);

  const scrollToToday = () => {
    if (containerRef.current) {
      const todayOffset = daysDiff(startDate, today);
      if (todayOffset >= 0 && todayOffset < totalDays) {
        containerRef.current.scrollTo({
          left: Math.max(0, todayOffset * DAY_WIDTH - 240),
          behavior: 'smooth'
        });
      }
    }
  };

  const toggleDivisionCollapse = (div: string) => {
    setCollapsedDivs(prev => ({ ...prev, [div]: !prev[div] }));
  };

  const todayIndex = daysDiff(startDate, today);
  const totalTimelineWidth = totalDays * DAY_WIDTH;

  // Group projects by division
  const groupedByDivision = useMemo(() => {
    const groups: { division: string; projects: ProjectTask[] }[] = [];
    const divList = [...DIVISIONS];

    divList.forEach(div => {
      const projs = allProjects.filter(p => p.division === div);
      if (projs.length > 0) {
        groups.push({ division: div, projects: projs });
      }
    });

    // Check for any unclassified division
    const otherProjects = allProjects.filter(p => !DIVISIONS.includes(p.division as any));
    if (otherProjects.length > 0) {
      groups.push({ division: 'Other Divisions', projects: otherProjects });
    }

    return groups;
  }, [allProjects]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col mb-8">
      {/* Gantt Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          {/* Division Filter */}
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg shadow-2xs outline-none"
          >
            <option value="All">All Divisions</option>
            {DIVISIONS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Toggle Tasks */}
          <button
            onClick={() => setShowTasks(!showTasks)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              showTasks
                ? 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            {showTasks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showTasks ? 'Tasks Visible' : 'Projects Only'}</span>
          </button>
        </div>

        {/* Legend & Jump to Today */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="hidden lg:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#16a34a]" />
              <span>Done</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2563eb]" />
              <span>In Progress</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#94a3af]" />
              <span>Not Started</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#dc2626]" />
              <span>Overdue</span>
            </span>
          </div>

          <button
            onClick={scrollToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-[#0e5773] border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>
        </div>
      </div>

      {/* Main Gantt Viewport */}
      {allProjects.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No project timelines available</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isManager
              ? 'Create a project to visualize your portfolio schedule on this Gantt chart.'
              : 'No project schedules found under your division.'}
          </p>
          {isManager && (
            <button
              onClick={onNewProject}
              className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-[#0e5773] hover:bg-[#0a4359] rounded-lg transition-colors cursor-pointer"
            >
              New Project
            </button>
          )}
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar relative"
        >
          <div style={{ width: `${260 + totalTimelineWidth}px` }} className="relative select-none">
            
            {/* Header: Month and Day Rows */}
            <div className="sticky top-0 z-20 flex bg-white border-b border-slate-200 shadow-2xs">
              {/* Sticky Top-Left Corner */}
              <div className="sticky left-0 z-30 w-[260px] min-w-[260px] bg-white border-r border-slate-200 px-3.5 py-2 flex items-center justify-between font-semibold text-xs text-slate-700">
                <span>Project & Task Breakdown</span>
              </div>

              {/* Month Scale and Day Scale */}
              <div style={{ width: `${totalTimelineWidth}px` }} className="flex-none">
                {/* Months Header */}
                <div className="flex border-b border-slate-100 h-6">
                  {months.map((m, i) => (
                    <div
                      key={i}
                      style={{ width: `${m.dayCount * DAY_WIDTH}px` }}
                      className="px-2 text-[11px] font-semibold text-slate-700 border-r border-slate-200 flex items-center bg-slate-50/70"
                    >
                      {m.label}
                    </div>
                  ))}
                </div>

                {/* Days Header */}
                <div className="flex h-6">
                  {days.map((d, i) => {
                    const isToday = +d === +today;
                    return (
                      <div
                        key={i}
                        style={{ width: `${DAY_WIDTH}px` }}
                        className={`text-center text-[10px] font-mono leading-6 border-r border-slate-100 flex-none ${
                          isToday ? 'bg-rose-50 text-rose-600 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Red "Today" Line */}
            {todayIndex >= 0 && todayIndex < totalDays && (
              <div
                style={{ left: `${260 + todayIndex * DAY_WIDTH + DAY_WIDTH / 2}px` }}
                className="absolute top-12 bottom-0 w-[2px] bg-rose-500 z-10 pointer-events-none opacity-85"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-[4px] -mt-1" />
              </div>
            )}

            {/* Divisions and Projects Body */}
            <div>
              {groupedByDivision.map(({ division, projects }) => {
                const isCollapsed = collapsedDivs[division];

                return (
                  <div key={division}>
                    {/* Division Header Row */}
                    <div className="flex h-8 bg-slate-100/80 border-b border-slate-200">
                      <div 
                        onClick={() => toggleDivisionCollapse(division)}
                        className="sticky left-0 z-15 w-[260px] min-w-[260px] bg-slate-100/95 border-r border-slate-200 px-3 flex items-center justify-between text-xs font-bold text-[#0e5773] cursor-pointer hover:bg-slate-200/80 transition-colors"
                      >
                        <span className="truncate">{division}</span>
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <div style={{ width: `${totalTimelineWidth}px` }} className="bg-slate-50/50" />
                    </div>

                    {/* Projects in Division */}
                    {!isCollapsed && projects.map(project => {
                      const stats = computeProjectStats(project, tasks);
                      const projFrom = parseDate(project.from);
                      const projTo = parseDate(project.to);

                      // Calculate position for project bar
                      let projBarLeft = 0;
                      let projBarWidth = 0;
                      const hasProjSpan = projFrom && projTo;

                      if (hasProjSpan) {
                        const fromOffset = daysDiff(startDate, projFrom);
                        const spanDays = daysDiff(projFrom, projTo) + 1;
                        projBarLeft = Math.max(0, fromOffset * DAY_WIDTH);
                        projBarWidth = Math.max(DAY_WIDTH, spanDays * DAY_WIDTH - 2);
                      }

                      const statusColor = DISPLAY_STATUS_COLORS[stats.status]?.hex || '#0e5773';

                      return (
                        <div key={project.id}>
                          {/* Project Summary Row */}
                          <div className="flex h-9 border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
                            {/* Sticky Left Label */}
                            <div 
                              onClick={() => onOpenProject(project.id)}
                              className="sticky left-0 z-15 w-[260px] min-w-[260px] bg-white group-hover:bg-slate-50 border-r border-slate-200 px-3.5 py-1.5 flex items-center justify-between cursor-pointer"
                              title={`${project.title} (${stats.percent}% done)`}
                            >
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {project.title}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 ml-2 shrink-0">
                                {stats.percent}%
                              </span>
                            </div>

                            {/* Project Bar Timeline */}
                            <div 
                              style={{ width: `${totalTimelineWidth}px` }} 
                              className="relative flex-none gantt-grid-bg"
                            >
                              {hasProjSpan && (
                                <div
                                  onClick={() => onOpenProject(project.id)}
                                  style={{
                                    left: `${projBarLeft}px`,
                                    width: `${projBarWidth}px`,
                                    borderColor: statusColor,
                                    backgroundColor: `${statusColor}20`
                                  }}
                                  title={`${project.title}: ${formatDate(project.from)} to ${formatDate(project.to)} (${stats.percent}% completed, ${stats.status})`}
                                  className="absolute top-1.5 h-6 rounded-md border text-slate-900 text-xs px-2 flex items-center overflow-hidden cursor-pointer shadow-2xs hover:brightness-95 transition-all"
                                >
                                  {/* Progress Fill */}
                                  <div
                                    style={{
                                      width: `${stats.percent}%`,
                                      backgroundColor: `${statusColor}80`
                                    }}
                                    className="absolute left-0 top-0 bottom-0 pointer-events-none"
                                  />
                                  <span className="relative z-5 font-semibold truncate text-[11px]">
                                    {project.title}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Task Rows (Child tasks) */}
                          {showTasks && stats.tasks.map(task => {
                            const taskFrom = parseDate(task.from);
                            const taskTo = parseDate(task.to);
                            const hasTaskSpan = taskFrom && taskTo;
                            const isOver = isTaskOverdue(task);

                            let taskBarLeft = 0;
                            let taskBarWidth = 0;

                            if (hasTaskSpan) {
                              const fromOffset = daysDiff(startDate, taskFrom);
                              const spanDays = daysDiff(taskFrom, taskTo) + 1;
                              taskBarLeft = Math.max(0, fromOffset * DAY_WIDTH);
                              taskBarWidth = Math.max(DAY_WIDTH, spanDays * DAY_WIDTH - 2);
                            }

                            const taskColor = isOver
                              ? '#dc2626'
                              : STATUS_COLORS[task.status]?.hex || '#94a3af';

                            return (
                              <div 
                                key={task.id} 
                                className="flex h-8 border-b border-slate-100 hover:bg-slate-50/80 transition-colors group"
                              >
                                {/* Sticky Task Label */}
                                <div 
                                  onClick={() => onOpenTask(task.id)}
                                  className="sticky left-0 z-15 w-[260px] min-w-[260px] bg-white group-hover:bg-slate-50 border-r border-slate-200 pl-7 pr-3 py-1 flex items-center justify-between text-xs text-slate-700 cursor-pointer"
                                  title={task.title}
                                >
                                  <span className="truncate">{task.title}</span>
                                  {task.assignee && (
                                    <span className="text-[10px] text-slate-500 ml-1 shrink-0 max-w-[80px] truncate">
                                      {task.assignee}
                                    </span>
                                  )}
                                </div>

                                {/* Task Bar Timeline */}
                                <div 
                                  style={{ width: `${totalTimelineWidth}px` }} 
                                  className="relative flex-none gantt-grid-bg"
                                >
                                  {hasTaskSpan && (
                                    <div
                                      onClick={() => onOpenTask(task.id)}
                                      style={{
                                        left: `${taskBarLeft}px`,
                                        width: `${taskBarWidth}px`,
                                        backgroundColor: taskColor,
                                      }}
                                      title={`${task.title} (${task.assignee || 'Unassigned'})\n${formatDate(task.from)} – ${formatDate(task.to)}\nStatus: ${task.status}${isOver ? ' (Overdue!)' : ''}`}
                                      className="absolute top-1.5 h-5 rounded text-white text-[10px] px-2 flex items-center overflow-hidden cursor-pointer shadow-2xs hover:scale-[1.01] transition-transform"
                                    >
                                      <span className="truncate font-medium">
                                        {task.assignee || task.title}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
