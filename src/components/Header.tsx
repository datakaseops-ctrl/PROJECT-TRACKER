import React from 'react';
import { User, AppView } from '../types';
import { 
  FolderKanban, 
  BarChart3, 
  GanttChartSquare, 
  LogOut, 
  Plus, 
  Layers
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onNewProject: () => void;
  onSignOut: () => void;
  activeProjectTitle?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView,
  onViewChange,
  onNewProject,
  onSignOut,
  activeProjectTitle,
}) => {
  const isManager = currentUser?.role === 'manager';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => onViewChange('dashboard')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0e5773] text-white flex items-center justify-center font-bold shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 tracking-tight block leading-tight">
                  Divisional Project Tracker
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Portfolio & Task Operations
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Tabs (Dashboard & Gantt Chart only) */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => onViewChange('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-slate-100 text-[#0e5773] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => onViewChange('gantt')}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'gantt'
                    ? 'bg-slate-100 text-[#0e5773] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <GanttChartSquare className="w-4 h-4" />
                <span>Gantt Chart</span>
              </button>

              {activeProjectTitle && currentView === 'project-detail' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e5773]/10 text-[#0e5773] text-sm font-medium rounded-md truncate max-w-xs ml-2">
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  <span className="truncate">{activeProjectTitle}</span>
                </div>
              )}
            </nav>
          )}

          {/* Zone 3: Primary Actions & User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <>
                {isManager && (
                  <button
                    onClick={onNewProject}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0e5773] hover:bg-[#0a4359] text-white text-xs font-semibold rounded-md shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Project</span>
                  </button>
                )}

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-2 pl-1">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 capitalize">
                      {currentUser.role}
                    </div>
                  </div>
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
