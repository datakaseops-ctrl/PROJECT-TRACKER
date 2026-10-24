import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  User, 
  ProjectTask, 
  AppView, 
  SheetConfig, 
  ProjectStats 
} from './types';
import { DEFAULT_USERS } from './config/constants';
import { 
  getStoredConfig, 
  saveStoredConfig, 
  fetchProjectTasks, 
  saveTaskToSheet, 
  computeProjectStats,
  normalizeRow
} from './services/dataService';
import { isTaskOverdue } from './utils/dateUtils';

// Components
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { KPIOverview } from './components/KPIOverview';
import { ApprovalQueue } from './components/ApprovalQueue';
import { ProjectTable } from './components/ProjectTable';
import { OverdueTasksTable } from './components/OverdueTasksTable';
import { GanttChart } from './components/GanttChart';
import { ProjectDetailView } from './components/ProjectDetailView';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';

const USER_SESSION_KEY = 'divisional_tracker_user_idx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [previousView, setPreviousView] = useState<AppView>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [config, setConfig] = useState<SheetConfig>(getStoredConfig());

  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [editingTaskData, setEditingTaskData] = useState<{
    task: ProjectTask | null;
    project: ProjectTask;
  } | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectTask | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastHashRef = useRef<string>('');

  // Toast notification helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Update tasks if content actually changed
  const applyTasksIfChanged = useCallback((newRawTasks: any[]) => {
    if (!Array.isArray(newRawTasks) || newRawTasks.length === 0) return;
    const normalized = newRawTasks
      .filter((r: any) => r && r.id != null && String(r.id).trim() !== '')
      .map(normalizeRow);

    const newHash = JSON.stringify(normalized);
    if (newHash !== lastHashRef.current) {
      lastHashRef.current = newHash;
      setTasks(normalized);
    }
  }, []);

  // Real-time EventSource (SSE) connection to backend
  useEffect(() => {
    if (!currentUser) return;

    let eventSource: EventSource | null = null;
    let pollFallbackInterval: any = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/sheet/events');

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if ((parsed.type === 'update' || parsed.type === 'init') && Array.isArray(parsed.data)) {
              applyTasksIfChanged(parsed.data);
            }
          } catch (e) {
            console.warn('Error parsing real-time event data', e);
          }
        };
      } catch (err) {
        console.warn('Real-time setup error', err);
      }
    };

    setupSSE();

    // Secondary real-time fast poll (every 4 seconds) to guarantee zero-miss synchronization
    pollFallbackInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/sheet/data');
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.data)) {
            applyTasksIfChanged(json.data);
          }
        }
      } catch {}
    }, 4000);

    return () => {
      if (eventSource) eventSource.close();
      if (pollFallbackInterval) clearInterval(pollFallbackInterval);
    };
  }, [currentUser, applyTasksIfChanged]);

  // Window Focus & Visibility Change Real-Time trigger
  useEffect(() => {
    const handleActive = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch('/api/sheet/data?fresh=true');
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.data)) {
            applyTasksIfChanged(json.data);
          }
        }
      } catch {}
    };

    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleActive();
    });

    return () => {
      window.removeEventListener('focus', handleActive);
    };
  }, [currentUser, applyTasksIfChanged]);

  // Cross-Tab Instant BroadcastChannel Sync
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('divisional_project_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'task_saved' && event.data.task) {
          setTasks(prev => {
            const idx = prev.findIndex(t => t.id === event.data.task.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = event.data.task;
              return copy;
            }
            return [...prev, event.data.task];
          });
        } else if (event.data?.type === 'full_reload') {
          fetchProjectTasks(config).then(res => {
            applyTasksIfChanged(res.tasks);
          });
        }
      };

      return () => {
        channel.close();
      };
    } catch {}
  }, [config, applyTasksIfChanged]);

  // Restore authenticated session on mount
  useEffect(() => {
    try {
      const storedIdx = sessionStorage.getItem(USER_SESSION_KEY);
      if (storedIdx !== null && DEFAULT_USERS[+storedIdx]) {
        setCurrentUser(DEFAULT_USERS[+storedIdx]);
      }
    } catch {}
  }, []);

  // Fetch initial data
  const loadData = useCallback(async () => {
    try {
      const result = await fetchProjectTasks(config);
      applyTasksIfChanged(result.tasks);
    } catch (err: any) {
      console.error('Failed to load initial project tasks', err);
    }
  }, [config, applyTasksIfChanged]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Sign In handler
  const handleSignIn = (user: User) => {
    const idx = DEFAULT_USERS.findIndex(u => u.name === user.name);
    try {
      if (idx >= 0) sessionStorage.setItem(USER_SESSION_KEY, String(idx));
    } catch {}
    setCurrentUser(user);
    setCurrentView('dashboard');
    setSelectedDivision('All');
    showToast(`Welcome back, ${user.name}`);
  };

  // Sign Out handler
  const handleSignOut = () => {
    try {
      sessionStorage.removeItem(USER_SESSION_KEY);
    } catch {}
    setCurrentUser(null);
    setCurrentView('dashboard');
    setSelectedProjectId(null);
  };

  // Change view
  const handleViewChange = (view: AppView) => {
    setPreviousView(currentView);
    setCurrentView(view);
  };

  // Save task in real-time
  const handleSaveTask = async (taskToSave: ProjectTask) => {
    // 1. Instant local state update
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === taskToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = taskToSave;
        return copy;
      }
      return [...prev, taskToSave];
    });

    // 2. Broadcast immediately to any other open browser tabs (<5ms)
    try {
      broadcastChannelRef.current?.postMessage({
        type: 'task_saved',
        task: taskToSave,
      });
    } catch {}

    // 3. Dispatch to server in real-time
    saveTaskToSheet(taskToSave, config).then(res => {
      showToast(res.message);
    }).catch(() => {
      showToast('Saved locally (network pending)');
    });
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    showToast('Task removed from portfolio');
  };

  // Save project in real-time
  const handleSaveProject = async (projectToSave: ProjectTask) => {
    const existing = tasks.find(t => t.id === projectToSave.id);
    const divisionChanged = existing && existing.division !== projectToSave.division;

    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === projectToSave.id);
      let nextList = [...prev];
      if (idx >= 0) {
        nextList[idx] = projectToSave;
      } else {
        nextList.push(projectToSave);
      }

      if (divisionChanged) {
        nextList = nextList.map(t => {
          if (t.parent === projectToSave.id) {
            return { ...t, division: projectToSave.division };
          }
          return t;
        });
      }
      return nextList;
    });

    saveTaskToSheet(projectToSave, config).then(res => {
      showToast(res.message);
    });

    if (!existing) {
      setSelectedProjectId(projectToSave.id);
      setCurrentView('project-detail');
    }
  };

  // Delete project and children
  const handleDeleteProject = async (projectId: string) => {
    setTasks(prev => prev.filter(t => t.id !== projectId && t.parent !== projectId));
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
      setCurrentView('dashboard');
    }
    showToast('Project deleted');
  };

  // Quick 1-click Approve
  const handleQuickApprove = async (task: ProjectTask) => {
    if (!task.requested_status) return;
    const todayStr = new Date().toLocaleDateString('en-GB');
    const updatedNote = `${todayStr} Manager: Approved status change to ${task.requested_status}`;
    const updated: ProjectTask = {
      ...task,
      status: task.requested_status,
      requested_status: '',
      manager_remark: task.manager_remark ? `${task.manager_remark}\n${updatedNote}` : updatedNote,
    };
    await handleSaveTask(updated);
  };

  // Quick 1-click Reject
  const handleQuickReject = async (task: ProjectTask) => {
    if (!task.requested_status) return;
    const todayStr = new Date().toLocaleDateString('en-GB');
    const updatedNote = `${todayStr} Manager: Rejected status change to ${task.requested_status}`;
    const updated: ProjectTask = {
      ...task,
      requested_status: '',
      manager_remark: task.manager_remark ? `${task.manager_remark}\n${updatedNote}` : updatedNote,
    };
    await handleSaveTask(updated);
  };

  // Open task in modal
  const handleOpenTask = (taskOrId: ProjectTask | string) => {
    const task = typeof taskOrId === 'string' ? tasks.find(t => t.id === taskOrId) : taskOrId;
    if (!task) return;
    const project = tasks.find(t => t.id === task.parent);
    if (project) {
      setEditingTaskData({ task, project });
    }
  };

  // Add new task to specific project
  const handleAddNewTask = (projectId: string) => {
    const project = tasks.find(t => t.id === projectId);
    if (project) {
      setEditingTaskData({ task: null, project });
    }
  };

  // Filter projects visible to user
  const visibleProjects = useMemo(() => {
    if (!currentUser) return [];
    let p = tasks.filter(x => !x.parent);

    if (currentUser.role === 'executive') {
      const userDivs = currentUser.divisions || [];
      p = p.filter(
        x => userDivs.includes(x.division) || tasks.some(t => t.parent === x.id && t.assignee === currentUser.name)
      );
    }

    if (selectedDivision !== 'All') {
      p = p.filter(x => x.division === selectedDivision);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      p = p.filter(
        x => x.title.toLowerCase().includes(q) || x.manager_remark.toLowerCase().includes(q)
      );
    }

    return p.map(proj => ({
      project: proj,
      stats: computeProjectStats(proj, tasks),
    }));
  }, [tasks, currentUser, selectedDivision, searchQuery]);

  // Tasks in user's purview
  const userPurviewTasks = useMemo(() => {
    if (!currentUser) return [];
    let allT = tasks.filter(x => !!x.parent);
    if (currentUser.role === 'executive') {
      allT = allT.filter(x => x.assignee === currentUser.name);
    }
    return allT;
  }, [tasks, currentUser]);

  // Compute overall KPI metrics
  const kpiData = useMemo(() => {
    const projectsCount = visibleProjects.length;
    const totalTasksCount = userPurviewTasks.length;
    const completed = userPurviewTasks.filter(t => t.status === 'Completed').length;
    const inProgress = userPurviewTasks.filter(t => t.status === 'In Progress').length;
    const notStarted = totalTasksCount - completed - inProgress;
    const overdue = userPurviewTasks.filter(isTaskOverdue).length;

    const pending = tasks.filter(
      t => !!t.parent && t.requested_status && t.requested_status !== t.status
    ).length;

    return {
      projectsCount,
      totalTasksCount,
      completed,
      inProgress,
      notStarted,
      overdue,
      pending,
    };
  }, [visibleProjects, userPurviewTasks, tasks]);

  // Overdue tasks list
  const overdueTasksList = useMemo(() => {
    return userPurviewTasks.filter(isTaskOverdue).sort((a, b) => a.to.localeCompare(b.to));
  }, [userPurviewTasks]);

  // Pending approval tasks (for manager)
  const pendingApprovalTasks = useMemo(() => {
    if (currentUser?.role !== 'manager') return [];
    return tasks.filter(
      t => !!t.parent && t.requested_status && t.requested_status !== t.status
    );
  }, [tasks, currentUser]);

  // Active Project for detail view
  const activeProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return tasks.find(t => t.id === selectedProjectId && !t.parent) || null;
  }, [selectedProjectId, tasks]);

  const activeProjectStats = useMemo(() => {
    if (!activeProject) return null;
    return computeProjectStats(activeProject, tasks);
  }, [activeProject, tasks]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1c2630] flex flex-col font-sans">
      {/* Header */}
      <Header
        currentUser={currentUser}
        currentView={currentView}
        onViewChange={handleViewChange}
        onNewProject={() => {
          setEditingProject(null);
          setIsProjectModalOpen(true);
        }}
        onSignOut={handleSignOut}
        activeProjectTitle={activeProject?.title}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser && (
          <>
            {/* View 1: Dashboard */}
            {currentView === 'dashboard' && (
              <div>
                {/* High-density KPI strip */}
                <KPIOverview
                  currentUser={currentUser}
                  totalProjects={kpiData.projectsCount}
                  totalTasks={kpiData.totalTasksCount}
                  completedTasks={kpiData.completed}
                  inProgressTasks={kpiData.inProgress}
                  notStartedTasks={kpiData.notStarted}
                  pendingApprovals={kpiData.pending}
                  overdueTasks={kpiData.overdue}
                />

                {/* Manager Approvals Queue */}
                {currentUser.role === 'manager' && (
                  <ApprovalQueue
                    pendingTasks={pendingApprovalTasks}
                    allProjects={tasks.filter(t => !t.parent)}
                    onApprove={handleQuickApprove}
                    onReject={handleQuickReject}
                    onOpenTask={handleOpenTask}
                  />
                )}

                {/* Portfolio Project Table */}
                <ProjectTable
                  projects={visibleProjects}
                  currentUser={currentUser}
                  selectedDivision={selectedDivision}
                  onSelectDivision={setSelectedDivision}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectProject={(pId) => {
                    setSelectedProjectId(pId);
                    setCurrentView('project-detail');
                  }}
                  onEditProject={(pId) => {
                    const p = tasks.find(t => t.id === pId);
                    if (p) {
                      setEditingProject(p);
                      setIsProjectModalOpen(true);
                    }
                  }}
                  onAddTask={handleAddNewTask}
                  onNewProject={() => {
                    setEditingProject(null);
                    setIsProjectModalOpen(true);
                  }}
                />

                {/* Overdue Tasks Spotlight */}
                <OverdueTasksTable
                  overdueTasks={overdueTasksList}
                  allProjects={tasks.filter(t => !t.parent)}
                  onOpenTask={handleOpenTask}
                />
              </div>
            )}

            {/* View 2: Gantt Chart */}
            {currentView === 'gantt' && (
              <div>
                <GanttChart
                  tasks={tasks}
                  currentUser={currentUser}
                  onOpenProject={(pId) => {
                    setSelectedProjectId(pId);
                    setCurrentView('project-detail');
                  }}
                  onOpenTask={handleOpenTask}
                  onNewProject={() => {
                    setEditingProject(null);
                    setIsProjectModalOpen(true);
                  }}
                />
              </div>
            )}

            {/* View 3: Project Detail View */}
            {currentView === 'project-detail' && activeProject && activeProjectStats && (
              <ProjectDetailView
                project={activeProject}
                stats={activeProjectStats}
                currentUser={currentUser}
                onBack={() => {
                  setCurrentView(previousView === 'project-detail' ? 'dashboard' : previousView);
                }}
                onEditProject={() => {
                  setEditingProject(activeProject);
                  setIsProjectModalOpen(true);
                }}
                onAddTask={() => handleAddNewTask(activeProject.id)}
                onOpenTask={handleOpenTask}
              />
            )}
          </>
        )}
      </main>

      {/* Login Modal */}
      {!currentUser && (
        <LoginModal onSignIn={handleSignIn} />
      )}

      {/* Task Modal (Create / Edit / Approval) */}
      {editingTaskData && currentUser && (
        <TaskModal
          task={editingTaskData.task}
          project={editingTaskData.project}
          currentUser={currentUser}
          onClose={() => setEditingTaskData(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Project Modal (Create / Edit) */}
      {isProjectModalOpen && currentUser && (
        <ProjectModal
          project={editingProject}
          initialDivision={selectedDivision !== 'All' ? selectedDivision : undefined}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
